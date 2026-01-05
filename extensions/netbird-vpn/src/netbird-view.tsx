import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { Action, ActionPanel, Color, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

type StatusInfo = {
  state: string;
  connected: boolean | null;
  raw: string;
  binary: string;
  netbirdIp?: string;
  profileName?: string;
  peers?: { connected: number; total: number };
  managementConnected?: boolean;
  signalConnected?: boolean;
};

type ParsedStatus = Omit<StatusInfo, "raw" | "binary">;

type CommandResult = {
  output: string;
  binary: string;
};

type LoginCaptureResult = {
  url: string | null;
  output: string;
  exited: boolean;
};

const NETBIRD_BINARIES = [
  "/Applications/NetBird.app/Contents/MacOS/netbird",
  "/usr/local/bin/netbird",
  "/opt/homebrew/bin/netbird",
];

const STATUS_TIMEOUT_MS = 10_000;
const ACTION_TIMEOUT_MS = 20_000;
const LOGIN_CAPTURE_TIMEOUT_MS = 8_000;
const POLL_INTERVAL_MS = 30_000;

function resolveNetbirdBinary(): string {
  for (const candidate of NETBIRD_BINARIES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "netbird";
}

function formatExecError(error: unknown): string {
  if (error && typeof error === "object") {
    const anyError = error as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const stderr = anyError.stderr ? anyError.stderr.toString().trim() : "";
    const stdout = anyError.stdout ? anyError.stdout.toString().trim() : "";
    const message = anyError.message ?? "Command failed";
    const detail = stderr || stdout;

    return detail ? `${message}: ${detail}` : message;
  }

  return String(error);
}

function extractFirstUrl(output: string): string | null {
  const match = output.match(/https?:\/\/[^\s"'<>]+/);
  if (!match) {
    return null;
  }

  return match[0].replace(/[),.;]+$/, "");
}

function runNetbird(args: string[], timeoutMs = STATUS_TIMEOUT_MS): Promise<CommandResult> {
  const binary = resolveNetbirdBinary();

  return new Promise((resolve, reject) => {
    execFile(binary, args, { encoding: "utf8", timeout: timeoutMs }, (error, stdout) => {
      if (error) {
        const timeoutSeconds = Math.ceil(timeoutMs / 1000);
        const isTimeout =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "ETIMEDOUT";
        const message = isTimeout ? `Command timed out after ${timeoutSeconds}s` : formatExecError(error);
        reject(new Error(message));
        return;
      }

      resolve({ output: stdout.trim(), binary });
    });
  });
}

function runNetbirdAuthCapture(args: string[]): Promise<LoginCaptureResult> {
  const binary = resolveNetbirdBinary();

  return new Promise((resolve, reject) => {
    let settled = false;
    let exited = false;
    let output = "";
    let timer: ReturnType<typeof setTimeout> | null = null;
    let child: ReturnType<typeof spawn> | null = null;

    const finalize = (result: LoginCaptureResult) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolve(result);
    };

    try {
      child = spawn(binary, args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      reject(new Error(formatExecError(error)));
      return;
    }

    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      reject(new Error(formatExecError(error)));
    });

    child.once("spawn", () => {
      child?.unref();
    });

    child.once("exit", () => {
      exited = true;
      finalize({ url: extractFirstUrl(output), output, exited });
    });

    const onData = (data: Buffer | string) => {
      if (settled) {
        return;
      }
      output = `${output}${data.toString()}`;
      if (output.length > 8000) {
        output = output.slice(-8000);
      }
      const url = extractFirstUrl(output);
      if (url) {
        finalize({ url, output, exited });
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    timer = setTimeout(() => {
      finalize({ url: extractFirstUrl(output), output, exited });
    }, LOGIN_CAPTURE_TIMEOUT_MS);
  });
}

async function tryRunNetbird(args: string[], timeoutMs = STATUS_TIMEOUT_MS): Promise<CommandResult | null> {
  try {
    return await runNetbird(args, timeoutMs);
  } catch {
    return null;
  }
}

function parseStatusFromOutput(output: string): ParsedStatus {
  const trimmed = output.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const json = JSON.parse(trimmed) as {
        management?: { connected?: boolean; error?: string };
        signal?: { connected?: boolean; error?: string };
        peers?: { connected?: number; total?: number };
        netbirdIp?: string;
        profileName?: string;
        events?: Array<{ message?: string } | string>;
      };

      const managementConnected = json.management?.connected;
      const signalConnected = json.signal?.connected;
      const peersConnected = (json.peers?.connected ?? 0) > 0;
      const hasIp = Boolean(json.netbirdIp);
      const connected = Boolean(managementConnected || signalConnected || peersConnected || hasIp);

      const eventMessages = Array.isArray(json.events)
        ? json.events
            .map((event) => (typeof event === "string" ? event : event?.message))
            .filter((event): event is string => Boolean(event))
        : [];

      const loginHints = [json.management?.error, json.signal?.error, ...eventMessages];
      const needsLogin = loginHints.some((hint) => typeof hint === "string" && /login|auth/i.test(hint));

      return {
        state: needsLogin && !connected ? "Needs Login" : connected ? "Connected" : "Disconnected",
        connected,
        netbirdIp: json.netbirdIp,
        profileName: json.profileName,
        peers: json.peers ? { connected: json.peers.connected ?? 0, total: json.peers.total ?? 0 } : undefined,
        managementConnected,
        signalConnected,
      };
    } catch {
      // Fall through to text parsing.
    }
  }

  const lower = output.toLowerCase();

  if (
    lower.includes("needslogin") ||
    lower.includes("needs login") ||
    lower.includes("login required") ||
    lower.includes("authentication required")
  ) {
    return { state: "Needs Login", connected: false };
  }

  if (lower.includes("disconnected") || lower.includes("idle") || lower.includes("down")) {
    return { state: "Disconnected", connected: false };
  }

  if (lower.includes("connected") || lower.includes("online")) {
    return { state: "Connected", connected: true };
  }

  return { state: "Unknown", connected: null };
}

function buildMarkdown(status: StatusInfo): string {
  const statusLine = status.state ? `**Status:** ${status.state}` : "**Status:** Unknown";
  const peersLine = status.peers ? `${status.peers.connected}/${status.peers.total}` : "-";
  const managementLine =
    status.managementConnected === undefined ? "-" : status.managementConnected ? "Connected" : "Disconnected";
  const signalLine = status.signalConnected === undefined ? "-" : status.signalConnected ? "Connected" : "Disconnected";

  return `# NetBird VPN\n\n${statusLine}\n\n**NetBird IP:** ${status.netbirdIp || "-"}\n\n**Profile:** ${status.profileName || "-"}\n\n**Peers:** ${peersLine}\n\n**Management:** ${managementLine}\n\n**Signal:** ${signalLine}\n\n**Binary:** ${status.binary}\n\n## Output\n\n\`\`\`\n${status.raw || "(no output)"}\n\`\`\`\n`;
}

async function runWithToast(title: string, args: string[], timeoutMs = ACTION_TIMEOUT_MS): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title });

  try {
    await runNetbird(args, timeoutMs);
    toast.style = Toast.Style.Success;
    toast.title = `${title} succeeded`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${title} failed`;
    toast.message = formatExecError(error);
  }
}

export default function Command(): ReactElement {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoginUrl, setLastLoginUrl] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const runLoginWithToast = async (): Promise<void> => {
    setLastLoginUrl(null);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Login" });

    try {
      const { url, exited } = await runNetbirdAuthCapture(["login", "--no-browser"]);
      if (url) {
        setLastLoginUrl(url);
        await open(url);
        toast.style = Toast.Style.Success;
        toast.title = "Login opened";
        toast.message = "Complete authentication in your browser.";
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = exited ? "Login started" : "Login in progress";
      toast.message = "If no browser opens, run `netbird login` in Terminal.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Login failed";
      toast.message = formatExecError(error);
    }
  };

  const runConnectWithToast = async (): Promise<void> => {
    setLastLoginUrl(null);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting" });

    try {
      const { url, exited } = await runNetbirdAuthCapture(["up", "--no-browser"]);
      if (url) {
        setLastLoginUrl(url);
        await open(url);
        toast.style = Toast.Style.Success;
        toast.title = "Login required";
        toast.message = "Opened browser for authentication.";
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = exited ? "Connect requested" : "Connecting";
      toast.message = exited ? "Check status in a few seconds." : "Finish authentication in your browser.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connect failed";
      toast.message = formatExecError(error);
    }
  };

  const loadStatus = useCallback(async (options?: { showLoading?: boolean }) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const showLoading = options?.showLoading ?? false;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const jsonResult = await tryRunNetbird(["status", "--json"], STATUS_TIMEOUT_MS);
      const result = jsonResult ?? (await runNetbird(["status"], STATUS_TIMEOUT_MS));
      const raw = result.output || "(no output)";

      const parsed = parseStatusFromOutput(raw);
      setStatus({
        ...parsed,
        raw,
        binary: result.binary,
      });
      if (parsed.connected) {
        setLastLoginUrl(null);
      }
    } catch (error) {
      setStatus({
        state: "Error",
        connected: null,
        raw: formatExecError(error),
        binary: resolveNetbirdBinary(),
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        if (cancelled) {
          return;
        }
        await loadStatus();
        scheduleNext();
      }, POLL_INTERVAL_MS);
    };

    void loadStatus({ showLoading: true }).finally(() => {
      scheduleNext();
    });

    return () => {
      cancelled = true;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadStatus]);

  const isConnected = status?.connected === true;
  const toggleTitle = isConnected ? "Disconnect" : "Connect";
  const toggleIcon = isConnected ? Icon.Stop : Icon.Play;
  const toggleArgs = isConnected ? ["down"] : ["up"];

  const statusColor = status?.connected === true ? Color.Green : status?.connected === false ? Color.Red : Color.Yellow;

  return (
    <Detail
      isLoading={isLoading}
      markdown={status ? buildMarkdown(status) : "Loading status..."}
      metadata={
        status ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={status.state}
              icon={{ source: Icon.Circle, tintColor: statusColor }}
            />
            {status.netbirdIp ? <Detail.Metadata.Label title="NetBird IP" text={status.netbirdIp} /> : null}
            {status.profileName ? <Detail.Metadata.Label title="Profile" text={status.profileName} /> : null}
            {status.peers ? (
              <Detail.Metadata.Label title="Peers" text={`${status.peers.connected}/${status.peers.total}`} />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={toggleTitle}
              icon={toggleIcon}
              onAction={async () => {
                if (isConnected) {
                  await runWithToast("Disconnecting", toggleArgs);
                } else {
                  await runConnectWithToast();
                }
                await loadStatus();
              }}
            />
            <Action
              title="Refresh Status"
              icon={Icon.RotateClockwise}
              onAction={() => loadStatus({ showLoading: true })}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Connect"
              icon={Icon.Play}
              onAction={async () => {
                await runConnectWithToast();
                await loadStatus();
              }}
            />
            {status?.connected !== true ? (
              <Action
                title="Login (Open Browser)"
                icon={Icon.Globe}
                onAction={async () => {
                  await runLoginWithToast();
                  await loadStatus();
                }}
              />
            ) : null}
            {status?.connected !== true && lastLoginUrl ? (
              <Action.CopyToClipboard title="Copy Login URL" content={lastLoginUrl} />
            ) : null}
            <Action
              title="Disconnect"
              icon={Icon.Stop}
              onAction={async () => {
                await runWithToast("Disconnecting", ["down"]);
                await loadStatus();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {status ? <Action.CopyToClipboard title="Copy Status Output" content={status.raw} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
