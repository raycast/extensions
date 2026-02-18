import { Action, ActionPanel, Detail, environment, Icon, type LaunchProps, open, Toast, showToast } from "@raycast/api";
import { promisify } from "node:util";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "swift:../swift/qr-code-scanner";

type ScannerState = "idle" | "scanning" | "scanned" | "error";
type CommandLaunchContext = { value?: string };
type ParsedQRCode = ParsedWifiQRCode | ParsedUrlQRCode | ParsedOtherQRCode;
type ParsedWifiQRCode = { kind: "wifi"; network: WifiNetwork };
type ParsedUrlQRCode = { kind: "url"; url: string };
type ParsedOtherQRCode = { kind: "other" };
type WifiNetwork = {
  ssid: string;
  password: string | null;
  security: string | null;
  hidden: boolean;
};

const execFileAsync = promisify(execFile);

export default function Command(props: LaunchProps<{ launchContext?: CommandLaunchContext }>) {
  const initialValue = props.launchContext?.value?.trim() || null;
  const [scannerState, setScannerState] = useState<ScannerState>(initialValue ? "scanned" : "idle");
  const [scanResult, setScanResult] = useState<string | null>(initialValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const didAutoStartRef = useRef(false);
  const isScanRunningRef = useRef(false);

  const startScan = useCallback(async () => {
    if (isScanRunningRef.current) {
      return;
    }
    isScanRunningRef.current = true;
    setScannerState("scanning");
    setScanResult(null);
    setErrorMessage(null);

    try {
      const result = await runNativeSwiftScanner();
      if (!result) {
        setScannerState("idle");
        await showToast({
          style: Toast.Style.Failure,
          title: "No QR Code Detected",
          message: "Keep the code centered and well lit, then try again.",
        });
        return;
      }

      setScanResult(result);
      setScannerState("scanned");
      setErrorMessage(null);

      try {
        await open("raycast://");
      } catch {
        // Ignore focus errors; result is still shown in the current command.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scanner error";
      setErrorMessage(message);
      setScannerState("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Scanner failed",
        message,
      });
    } finally {
      isScanRunningRef.current = false;
    }
  }, []);

  const clear = useCallback(() => {
    setScanResult(null);
    setErrorMessage(null);
    setScannerState("idle");
  }, []);

  useEffect(() => {
    if (didAutoStartRef.current) {
      return;
    }
    didAutoStartRef.current = true;
    if (initialValue) {
      return;
    }
    void startScan();
  }, [initialValue, startScan]);

  const parsedQRCode = useMemo(() => parseQRCodeContent(scanResult), [scanResult]);

  const connectToWifi = useCallback(async (network: WifiNetwork) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting to Wi-Fi...",
      });
      await connectToWifiNetwork(network);
      await showToast({
        style: Toast.Style.Success,
        title: "Connected to Wi-Fi",
        message: network.ssid,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect to Wi-Fi";
      await showToast({
        style: Toast.Style.Failure,
        title: "Wi-Fi connection failed",
        message,
      });
    }
  }, []);

  const markdown = buildMarkdown(scannerState, scanResult, errorMessage, parsedQRCode);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {parsedQRCode.kind === "wifi" ? (
            <Action
              title="Connect to Wi-Fi Network"
              icon={Icon.Wifi}
              onAction={() => {
                void connectToWifi(parsedQRCode.network);
              }}
            />
          ) : null}
          {parsedQRCode.kind === "url" ? <Action.OpenInBrowser title="Open URL" url={parsedQRCode.url} /> : null}
          {parsedQRCode.kind === "other" || !scanResult ? (
            <Action
              title={scannerState === "scanning" ? "Scan in Progress" : "Start Scanner"}
              icon={Icon.Camera}
              onAction={startScan}
            />
          ) : null}
          {parsedQRCode.kind === "wifi" || parsedQRCode.kind === "url" ? (
            <Action
              title={scannerState === "scanning" ? "Scan in Progress" : "Start Scanner"}
              icon={Icon.Camera}
              onAction={startScan}
            />
          ) : null}
          {scanResult ? <Action.CopyToClipboard title="Copy Result" content={scanResult} /> : null}
          {(scanResult || errorMessage) && <Action title="Reset" icon={Icon.XmarkCircle} onAction={clear} />}
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(state: ScannerState, result: string | null, error: string | null, parsedQRCode: ParsedQRCode) {
  if (result) {
    if (parsedQRCode.kind === "wifi") {
      return buildWifiMarkdown(parsedQRCode.network, result);
    }
    if (parsedQRCode.kind === "url") {
      return buildUrlMarkdown(parsedQRCode.url, result);
    }

    return ["# QR Code Webcam Scanner", "", "Decoded content:", "", "```text", sanitizeCodeFence(result), "```"].join(
      "\n",
    );
  }

  if (state === "scanning") {
    return [
      "# QR Code Webcam Scanner",
      "",
      "Native scanner opened.",
      "",
      "1. Grant camera access to the scanner window.",
      "2. Point your webcam to a QR code.",
      "3. The result returns automatically to Raycast.",
    ].join("\n");
  }

  if (state === "error" && error) {
    return ["# QR Code Webcam Scanner", "", "```text", sanitizeCodeFence(error), "```"].join("\n");
  }

  return ["# QR Code Webcam Scanner", "", "Press Enter to launch the webcam scanner."].join("\n");
}

function sanitizeCodeFence(value: string) {
  return value.replaceAll("```", "'''");
}

function buildWifiMarkdown(network: WifiNetwork, rawContent: string) {
  const securityLabel = formatWifiSecurity(network.security);
  const hiddenLabel = network.hidden ? "Yes" : "No";
  const passwordLabel =
    network.password && network.password.trim() ? `\`${sanitizeCodeFence(network.password)}\`` : "None";

  return [
    "# QR Code Webcam Scanner",
    "",
    "## Wi-Fi Network Detected",
    "",
    `- **SSID**: \`${sanitizeCodeFence(network.ssid)}\``,
    `- **Security**: ${securityLabel}`,
    `- **Password**: ${passwordLabel}`,
    `- **Hidden Network**: ${hiddenLabel}`,
    "",
    "Raw content:",
    "",
    "```text",
    sanitizeCodeFence(rawContent),
    "```",
  ].join("\n");
}

function formatWifiSecurity(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return "Unknown";
  }
  if (normalized === "NOPASS") {
    return "None (open network)";
  }

  return normalized;
}

function buildUrlMarkdown(url: string, rawContent: string) {
  const parsed = new URL(url);
  const protocolLabel =
    parsed.protocol === "https:" ? "HTTPS (secure)" : parsed.protocol.replace(":", "").toUpperCase();
  const pathLabel = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/";
  const queryLabel = parsed.search ? `\`${sanitizeCodeFence(parsed.search)}\`` : "None";
  const fragmentLabel = parsed.hash ? `\`${sanitizeCodeFence(parsed.hash)}\`` : "None";

  return [
    "# QR Code Webcam Scanner",
    "",
    "## URL Detected",
    "",
    `- **Domain**: \`${sanitizeCodeFence(parsed.host)}\``,
    `- **Protocol**: ${protocolLabel}`,
    `- **Path**: \`${sanitizeCodeFence(pathLabel)}\``,
    `- **Query**: ${queryLabel}`,
    `- **Fragment**: ${fragmentLabel}`,
    "",
    `**Open:** [${sanitizeCodeFence(url)}](${sanitizeCodeFence(url)})`,
    "",
    "Raw content:",
    "",
    "```text",
    sanitizeCodeFence(rawContent),
    "```",
  ].join("\n");
}

function toHttpUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function parseQRCodeContent(value: string | null): ParsedQRCode {
  if (!value) {
    return { kind: "other" };
  }

  const wifiNetwork = parseWifiQRCode(value);
  if (wifiNetwork) {
    return { kind: "wifi", network: wifiNetwork };
  }

  const url = toHttpUrl(value);
  if (url) {
    return { kind: "url", url };
  }

  return { kind: "other" };
}

function parseWifiQRCode(value: string): WifiNetwork | null {
  const normalized = value.trim();
  if (!normalized.toUpperCase().startsWith("WIFI:")) {
    return null;
  }

  const payload = normalized.slice(5);
  const fields = parseWifiFields(payload);
  const ssid = fields.get("S");
  if (!ssid) {
    return null;
  }

  return {
    ssid,
    password: fields.get("P") ?? null,
    security: fields.get("T") ?? null,
    hidden: parseWifiBoolean(fields.get("H")),
  };
}

function parseWifiFields(payload: string): Map<string, string> {
  const fields = new Map<string, string>();
  let token = "";
  let escaped = false;

  const pushToken = () => {
    if (!token) {
      token = "";
      return;
    }
    const separatorIndex = token.indexOf(":");
    if (separatorIndex <= 0) {
      token = "";
      return;
    }

    const key = token.slice(0, separatorIndex).toUpperCase();
    const value = token.slice(separatorIndex + 1);
    fields.set(key, unescapeWifiValue(value));
    token = "";
  };

  for (const char of payload) {
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === ";") {
      pushToken();
      continue;
    }

    token += char;
  }

  pushToken();
  return fields;
}

function unescapeWifiValue(value: string): string {
  let unescaped = "";
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      unescaped += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    unescaped += char;
  }

  if (escaped) {
    unescaped += "\\";
  }

  return unescaped;
}

function parseWifiBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true";
}

async function connectToWifiNetwork(network: WifiNetwork): Promise<void> {
  const device = await getWifiDeviceName();
  const args = ["-setairportnetwork", device, network.ssid];

  if (network.password) {
    args.push(network.password);
  }

  await execFileAsync("/usr/sbin/networksetup", args);
}

async function getWifiDeviceName(): Promise<string> {
  const { stdout } = await execFileAsync("/usr/sbin/networksetup", ["-listallhardwareports"]);
  const lines = stdout.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]?.trim();
    if (line !== "Hardware Port: Wi-Fi") {
      continue;
    }

    for (let offset = index + 1; offset < lines.length; offset++) {
      const candidate = lines[offset]?.trim() ?? "";
      if (!candidate) {
        break;
      }
      if (!candidate.startsWith("Device: ")) {
        continue;
      }
      return candidate.slice("Device: ".length).trim();
    }
  }

  throw new Error("Could not find the Wi-Fi interface on this machine.");
}

async function runNativeSwiftScanner(): Promise<string | null> {
  if (process.platform === "win32") {
    throw new Error("Native scanner is only supported on macOS.");
  }

  const swiftPath = join(environment.assetsPath, "compiled_raycast_swift", "qr-code-scanner");
  const iconPath = join(environment.assetsPath, "scanner-window-icon.icns");
  await chmod(swiftPath, "755");

  return new Promise((resolve, reject) => {
    const child = spawn(swiftPath, ["scanQRCode", "--icon-path", iconPath]);
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    child.stdout?.on("data", (chunk) => {
      stdout.push(chunk.toString());
    });
    child.stderr?.on("data", (chunk) => {
      stderr.push(chunk.toString());
    });

    child.on("exit", (code, signal) => {
      exitCode = code;
      exitSignal = signal;
    });

    child.on("close", () => {
      settle(() => {
        if (exitCode === 0) {
          const raw = stdout.join("").trim();
          if (!raw) {
            resolve(null);
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed === null || typeof parsed === "string") {
              resolve(parsed);
              return;
            }
            reject(new Error("Native scanner returned an invalid JSON payload."));
          } catch (error) {
            reject(
              new Error(`Could not parse scanner output: ${error instanceof Error ? error.message : "Unknown error"}`),
            );
          }
          return;
        }

        const processError = exitSignal
          ? `Native scanner was terminated by signal ${exitSignal}`
          : `Native scanner exited with code ${exitCode ?? "unknown"}`;
        const message = stderr.join("").trim() || stdout.join("").trim() || processError;
        reject(new Error(message));
      });
    });

    child.on("error", (error) => {
      settle(() => reject(error));
    });
  });
}
