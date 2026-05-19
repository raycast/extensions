import { Detail, environment } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { Jimp } from "jimp";
import jsQR from "jsqr";

import { saveToHistory } from "./utils";
import { ScanResultDetail } from "./scan-result-detail";

const STARTUP_TIMEOUT_MS = 5000;

type ScanStatus = "scanning" | "found" | "error";

export default function Command() {
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [cameraReady, setCameraReady] = useState(false);
  const [decoded, setDecoded] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const procRef = useRef<ChildProcess | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;

    async function startCapture() {
      const binaryPath = join(environment.assetsPath, "capture-frame");

      try {
        await chmod(binaryPath, 0o755);
      } catch {
        // Ignore — may already be executable
      }

      const proc = spawn(binaryPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      procRef.current = proc;

      startupTimer = setTimeout(() => {
        if (!doneRef.current) {
          setStatus("error");
          setErrorMessage(
            "Camera did not produce frames. Check camera permissions in System Settings > Privacy & Security > Camera.",
          );
          proc.kill("SIGTERM");
        }
      }, STARTUP_TIMEOUT_MS);

      let stderrOutput = "";
      proc.stderr?.on("data", (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      proc.on("close", (code) => {
        if (doneRef.current) return;
        if (code !== 0 && code !== null) {
          setStatus("error");
          setErrorMessage(
            stderrOutput.trim() || `Camera process exited with code ${code}`,
          );
        }
      });

      proc.on("error", (err) => {
        if (doneRef.current) return;
        setStatus("error");
        setErrorMessage(err.message);
      });

      const rl = createInterface({ input: proc.stdout! });

      // QR detection state
      let latestLine: string | null = null;
      let processing = false;

      async function detectQR(base64Line: string) {
        if (doneRef.current) return;
        processing = true;

        try {
          const buffer = Buffer.from(base64Line, "base64");
          const image = await Jimp.read(buffer);
          const { data, width, height } = image.bitmap;
          const imageData = new Uint8ClampedArray(
            data.buffer,
            data.byteOffset,
            data.byteLength,
          );
          const result = jsQR(imageData, width, height);

          if (result && !doneRef.current) {
            doneRef.current = true;
            await saveToHistory(result.data);
            setDecoded(result.data);
            setStatus("found");
            rl.close();
            proc.kill("SIGTERM");
            return;
          }
        } catch {
          // Corrupted frame — skip
        }

        processing = false;

        if (latestLine && !doneRef.current) {
          const next = latestLine;
          latestLine = null;
          detectQR(next);
        }
      }

      rl.on("line", (line) => {
        if (doneRef.current) return;

        if (startupTimer) {
          clearTimeout(startupTimer);
          startupTimer = null;
        }
        setCameraReady(true);

        // QR detection (every frame, with frame dropping)
        if (processing) {
          latestLine = line;
        } else {
          detectQR(line);
        }
      });
    }

    startCapture();

    return () => {
      doneRef.current = true;
      if (startupTimer) clearTimeout(startupTimer);
      if (procRef.current) {
        procRef.current.kill("SIGTERM");
        procRef.current = null;
      }
    };
  }, []);

  if (status === "found") {
    return <ScanResultDetail data={decoded} />;
  }

  let markdown = "";
  if (status === "scanning") {
    markdown = cameraReady
      ? `🟢 **Camera is ready**\n\nSimply hold the QR code in front of your camera.`
      : `🟠 **Camera is loading…**`;
  } else {
    markdown = `**Error**\n\n${errorMessage}`;
  }

  return <Detail isLoading={status === "scanning"} markdown={markdown} />;
}
