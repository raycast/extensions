import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdbError, checkAdb, checkMdns, listDevices } from "./lib/adb";
import { AdbNotFoundError, resolveAdbPath } from "./lib/adb-path";
import { isWindows } from "./lib/path-utils";
import { runPairingFlow, type PairingPhase } from "./lib/pairing";
import { createPairingCredentials, payloadToDataUrl, type PairingCredentials } from "./lib/qr";

type Preferences = {
  adbPath: string;
  pairingTimeout: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      credentials: PairingCredentials;
      qrDataUrl: string;
      phase: PairingPhase | "idle";
      statusMessage: string;
      devices?: string;
      connectedHost?: string;
      connectedPort?: number;
      adbPath: string;
    };

function parseTimeoutSeconds(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 10) {
    return 60;
  }
  return parsed;
}

function phaseLabel(phase: PairingPhase | "idle"): string {
  switch (phase) {
    case "idle":
      return "Scan the QR code with your phone";
    case "waiting_scan":
      return "Waiting for scan…";
    case "pairing":
      return "Pairing…";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
  }
}

function buildMarkdown(state: ViewState): string {
  if (state.kind === "loading") {
    return "Checking for `adb`…";
  }

  if (state.kind === "error") {
    return `# Could not start pairing\n\n${state.message}`;
  }

  const { qrDataUrl, phase, statusMessage, devices, connectedHost, connectedPort } = state;
  const lines = [
    `# ${phaseLabel(phase)}`,
    "",
    `![ADB pairing QR](${qrDataUrl}?raycast-width=200&raycast-height=200)`,
    "",
    "## On your phone",
    "1. Open **Settings → Developer options → Wireless debugging**",
    "2. Tap **Pair device with QR code**",
    "3. Scan the code above",
    "",
    "_Phone and computer must be on the same Wi‑Fi network._",
  ];

  if (statusMessage) {
    lines.push("", `> ${statusMessage}`);
  }

  if (phase === "connected" && connectedHost && connectedPort) {
    lines.push("", `**Endpoint:** \`${connectedHost}:${connectedPort}\``);
  }

  if (devices) {
    lines.push("", "## adb devices", "", "```", devices, "```");
  }

  return lines.join("\n");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const pairingTimeoutMs = parseTimeoutSeconds(preferences.pairingTimeout) * 1000;

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [sessionKey, setSessionKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const startSession = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ kind: "loading" });

    let adbPath: string;
    try {
      adbPath = await resolveAdbPath(preferences.adbPath);
      await checkAdb(adbPath);
    } catch (error) {
      const message =
        error instanceof AdbNotFoundError || error instanceof Error
          ? error.message
          : "`adb` was not found or failed to run.";
      setState({ kind: "error", message });
      return;
    }

    const credentials = createPairingCredentials();
    let qrDataUrl: string;

    try {
      qrDataUrl = await payloadToDataUrl(credentials.payload);
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate QR code.",
      });
      return;
    }

    const mdns = await checkMdns(adbPath);
    let initialStatus = "Ready — scan the QR code from your phone.";
    if (!mdns.ok) {
      initialStatus = isWindows()
        ? "Ready — scan the QR code. If pairing times out, install [Bonjour](https://support.apple.com/kb/DL999) or check `adb mdns check` in a terminal."
        : `Ready — scan the QR code. (mDNS note: ${mdns.message})`;
    }

    setState({
      kind: "ready",
      credentials,
      qrDataUrl,
      phase: "idle",
      statusMessage: initialStatus,
      adbPath,
    });

    try {
      const result = await runPairingFlow(adbPath, credentials, pairingTimeoutMs, controller.signal, {
        onPhase: (phase) => {
          setState((current) => {
            if (current.kind !== "ready") {
              return current;
            }
            return {
              ...current,
              phase,
              statusMessage: phaseLabel(phase),
            };
          });
        },
      });

      const devices = await listDevices(adbPath);

      setState({
        kind: "ready",
        credentials,
        qrDataUrl,
        phase: "connected",
        statusMessage: `${result.pairMessage}\n${result.connectMessage}`,
        devices,
        connectedHost: result.host,
        connectedPort: result.connectPort,
        adbPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Device connected",
        message: `${result.host}:${result.connectPort}`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message =
        error instanceof AdbError ? error.message : error instanceof Error ? error.message : "Pairing failed.";

      setState((current) => {
        if (current.kind === "ready") {
          return {
            ...current,
            phase: "idle",
            statusMessage: message,
          };
        }
        return { kind: "error", message };
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Pairing failed",
        message,
      });
    }
  }, [preferences.adbPath, pairingTimeoutMs]);

  useEffect(() => {
    void startSession();
    return () => {
      abortRef.current?.abort();
    };
  }, [startSession, sessionKey]);

  const regenerate = useCallback(() => {
    setSessionKey((key) => key + 1);
  }, []);

  const isRunning = state.kind === "ready" && state.phase !== "idle" && state.phase !== "connected";

  return (
    <Detail
      isLoading={state.kind === "loading" || isRunning}
      markdown={buildMarkdown(state)}
      metadata={
        state.kind === "ready" ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ADB" text={state.adbPath} />
            <Detail.Metadata.Label title="Service" text={state.credentials.serviceName} />
            <Detail.Metadata.Label title="Status" text={phaseLabel(state.phase)} />
            {state.connectedHost ? (
              <Detail.Metadata.Label title="Address" text={`${state.connectedHost}:${state.connectedPort ?? ""}`} />
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="New QR Code"
            icon={Icon.ArrowClockwise}
            onAction={regenerate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {state.kind === "ready" ? (
            <Action.CopyToClipboard
              title="Copy Pairing Payload"
              icon={Icon.Clipboard}
              content={state.credentials.payload}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
