/* eslint-disable prefer-const */
import { useEffect, useRef } from "react";
import { environment } from "@raycast/api";
import { join } from "path";
import { chmod } from "fs/promises";
import { ExecaChildProcess, execa } from "execa";
import os from "os";
import { unlinkSync } from "fs";
import { ApertureOptions, CropArea, RecorderCodec, VideoCodec } from "~/types/aperture";
import { getRandomString } from "~/utils/crypto";

const BIN_PATH = join(environment.assetsPath, "aperture");
const execAperture = (...args: string[]) => execa(BIN_PATH, args);

export type Options = {
  fps?: number;
  cropArea?: CropArea;
  showCursor?: boolean;
  highlightClicks?: boolean;
  audioDeviceId?: string;
  videoCodec: VideoCodec;
  screenId: number;
};

export type RecordingResult = {
  pid: number;
  filePath: string;
  startTime: Date;
};

export function useAperture() {
  const apertureProcessId = useRef<string>();
  const process = useRef<ExecaChildProcess<string>>();
  const tmpPath = useRef<string>();

  useEffect(() => {
    void chmod(BIN_PATH, "755");
  }, []);

  const clearRecording = () => {
    apertureProcessId.current = undefined;
    process.current = undefined;
    tmpPath.current = undefined;
  };

  const startRecording = async (options?: Options): Promise<RecordingResult> => {
    return new Promise((resolve, reject) => {
      (async () => {
        if (process.current != null) {
          reject(new Error("Call `.stopRecording()` first"));
          return;
        }

        const filePath = getTemporaryRecordingFilePath();
        tmpPath.current = filePath;
        const recorderOptions = getRecorderOptions(tmpPath.current, options);

        const timeout = setTimeout(() => {
          if (process.current === undefined) return; // stopRecording was called already

          const error = new Error("Could not start recording within 5 seconds");
          process.current.kill();
          process.current = undefined;
          reject(error);
        }, 5000);

        let isFileReadyPromise: Promise<boolean>;

        (async () => {
          try {
            await waitForEvent("onStart");
            const startTime = new Date();
            clearTimeout(timeout);
            if (!process.current?.pid) return reject(new Error("Recorder did not start"));
            const pid = process.current.pid;

            setTimeout(async () => {
              await isFileReadyPromise;
              resolve({ pid, filePath, startTime });
            }, 1000);
          } catch (error) {
            clearRecording();
            reject(error);
          }
        })();

        isFileReadyPromise = (async () => {
          await waitForEvent("onFileReady");
          return true;
        })();

        apertureProcessId.current = getRandomString();
        process.current = execAperture(
          "record",
          "--process-id",
          apertureProcessId.current,
          JSON.stringify(recorderOptions)
        );
        
        process.current.catch((error) => {
          if (tmpPath.current) unlinkSync(tmpPath.current);
          clearRecording();
          clearTimeout(timeout);
          reject(error);
        });

        if (process.current.stdout) {
          process.current.stdout.setEncoding("utf8");
          process.current.stdout.on("data", console.error);
        }
      })();
    });
  };

  async function waitForEvent(name: string) {
    if (!apertureProcessId.current) return;
    const { stdout } = await execAperture(
      "events",
      "listen",
      "--process-id",
      apertureProcessId.current,
      "--exit",
      name
    );
    console.log("waitForEvent", { stdout });
  }

  async function throwIfNotStarted() {
    if (process.current === undefined) {
      throw new Error("Call `.startRecording()` first");
    }
  }

  async function stopRecording() {
    throwIfNotStarted();

    if (process.current) {
      process.current.kill();
      await process.current;
      clearRecording();
    }
    return tmpPath.current;
  }

  return {
    startRecording,
    stopRecording,
  };
}

function checkSupportsHevcHardwareEncoding() {
  const cpuModel = os.cpus()[0].model;

  // All Apple silicon Macs support HEVC hardware encoding.
  if (cpuModel.startsWith("Apple ")) {
    // Source string example: `'Apple M1'`
    return true;
  }

  // Get the Intel Core generation, the `4` in `Intel(R) Core(TM) i7-4850HQ CPU @ 2.30GHz`
  // More info: https://www.intel.com/content/www/us/en/processors/processor-numbers.html
  // Example strings:
  // - `Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz`
  // - `Intel(R) Core(TM) i7-4850HQ CPU @ 2.30GHz`
  const result = /Intel.*Core.*i\d+-(\d)/.exec(cpuModel);

  // Intel Core generation 6 or higher supports HEVC hardware encoding
  return result && Number.parseInt(result[1], 10) >= 6;
}

function getRecorderOptions(tmpFilePath: string, options?: Options) {
  const {
    fps = 30,
    cropArea,
    showCursor = true,
    highlightClicks = false,
    audioDeviceId,
    videoCodec = "h264",
    screenId = 0,
  } = options ?? {};

  const recorderOptions: ApertureOptions = {
    destination: `file://${tmpFilePath}`,
    framesPerSecond: fps,
    showCursor,
    highlightClicks,
    screenId,
    audioDeviceId,
  };

  if (highlightClicks === true) {
    recorderOptions.showCursor = true;
  }

  if (
    typeof cropArea === "object" &&
    (typeof cropArea.x !== "number" ||
      typeof cropArea.y !== "number" ||
      typeof cropArea.width !== "number" ||
      typeof cropArea.height !== "number")
  ) {
    throw new Error("Invalid `cropArea` option object");
  }

  if (cropArea) {
    recorderOptions.cropRect = [
      [cropArea.x, cropArea.y],
      [cropArea.width, cropArea.height],
    ];
  }

  if (videoCodec) {
    const codecMap = new Map<string, RecorderCodec>([
      ["h264", "avc1"],
      ["hevc", "hvc1"],
      ["proRes422", "apcn"],
      ["proRes4444", "ap4h"],
    ]);

    if (!checkSupportsHevcHardwareEncoding()) {
      codecMap.delete("hevc");
    }

    if (!codecMap.has(videoCodec)) {
      throw new Error(`Unsupported video codec specified: ${videoCodec}`);
    }

    recorderOptions.videoCodec = codecMap.get(videoCodec);
  }

  return recorderOptions;
}

function getTemporaryRecordingFilePath() {
  return join(os.tmpdir(), `aperture-tmp-${getRandomId()}.mp4`);
}
