import { showFailureToast } from "@raycast/utils";

export type SshErrorKind =
  | "auth"
  | "host-key"
  | "unknown-host"
  | "host-not-in-config"
  | "refused"
  | "timeout"
  | "network"
  | "remote-cmd"
  | "unknown";

export type SshErrorInfo = {
  kind: SshErrorKind;
  host?: string;
  title: string;
  message: string;
  hint?: string;
  raw: string;
};

export class SshError extends Error {
  constructor(public readonly info: SshErrorInfo) {
    super(info.message);
    this.name = "SshError";
  }
}

// Kept as a subclass so legacy `err instanceof SshAuthError` checks
// (select-cluster.tsx, multi.ts) keep matching auth failures.
export class SshAuthError extends SshError {
  public readonly host: string;
  constructor(info: SshErrorInfo) {
    super(info);
    this.name = "SshAuthError";
    this.host = info.host ?? "";
  }
}

type RawError = { stderr?: string; message?: string; code?: number | string; signal?: string };

function extractText(err: unknown): { stderr: string; message: string } {
  if (err && typeof err === "object") {
    const e = err as RawError;
    return { stderr: (e.stderr ?? "").trim(), message: (e.message ?? "").trim() };
  }
  return { stderr: "", message: String(err) };
}

function firstLine(s: string, max = 200): string {
  const line =
    s
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function withHost(s: string, host?: string): string {
  return host ? `${s} — ${host}` : s;
}

export function classifySshError(err: unknown, host?: string): SshErrorInfo {
  if (err instanceof SshError) {
    // If a caller passes an already-classified error, just rehome the host.
    return { ...err.info, host: err.info.host ?? host };
  }
  const { stderr, message } = extractText(err);
  const raw = stderr || message || "Unknown error";
  const haystack = `${stderr}\n${message}`;

  // Auth
  if (/Permission denied|publickey|password:|verification code|Two-factor|Could not request channel/i.test(haystack)) {
    return {
      kind: "auth",
      host,
      title: withHost("Authentication required", host),
      message: "SSH refused the non-interactive login (key, password, or 2FA needed).",
      hint: "Open in Terminal to authenticate, then come back.",
      raw,
    };
  }

  // Host key
  if (/Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED/i.test(haystack)) {
    return {
      kind: "host-key",
      host,
      title: withHost("Host key changed", host),
      message: "The server's identity doesn't match ~/.ssh/known_hosts.",
      hint: host
        ? `If you trust the new key, run: ssh-keygen -R ${host}`
        : "If you trust the new key, run: ssh-keygen -R <host>",
      raw,
    };
  }

  // DNS
  if (
    /Could not resolve hostname|nodename nor servname|Name or service not known|Temporary failure in name resolution/i.test(
      haystack,
    )
  ) {
    return {
      kind: "unknown-host",
      host,
      title: withHost("Unknown host", host),
      message: "DNS could not resolve the hostname.",
      hint: "Check HostName in ~/.ssh/config, your network, or your VPN.",
      raw,
    };
  }

  // Refused
  if (/Connection refused/i.test(haystack)) {
    return {
      kind: "refused",
      host,
      title: withHost("Connection refused", host),
      message: "The host responded but isn't accepting SSH connections.",
      hint: "Check that sshd is running on the host and the Port is correct.",
      raw,
    };
  }

  // Timeout (covers ETIMEDOUT, ConnectTimeout exit, and command-timeout signals)
  if (
    /Connection timed out|Operation timed out|ETIMEDOUT/i.test(haystack) ||
    (err && typeof err === "object" && (err as RawError).code === "ETIMEDOUT") ||
    (err && typeof err === "object" && (err as RawError).signal === "SIGTERM")
  ) {
    return {
      kind: "timeout",
      host,
      title: withHost("Connection timed out", host),
      message: "No response within the SSH connect window.",
      hint: "Check your VPN, your network, or that the host is online.",
      raw,
    };
  }

  // Network
  if (/Network is unreachable|No route to host/i.test(haystack)) {
    return {
      kind: "network",
      host,
      title: withHost("Network unreachable", host),
      message: "Your machine has no route to the host.",
      hint: "Check your network connection or VPN.",
      raw,
    };
  }

  // Remote command failure (squeue/scancel/scontrol etc. wrote something useful to stderr).
  if (stderr) {
    return {
      kind: "remote-cmd",
      host,
      title: host ? `${host}: command failed` : "Remote command failed",
      message: firstLine(stderr),
      raw,
    };
  }

  return {
    kind: "unknown",
    host,
    title: withHost("SSH error", host),
    message: firstLine(message || raw),
    raw,
  };
}

export function toSshError(err: unknown, host?: string): SshError {
  if (err instanceof SshError) return err;
  const info = classifySshError(err, host);
  return info.kind === "auth" ? new SshAuthError(info) : new SshError(info);
}

export function makeHostNotInConfigError(host: string): SshError {
  return new SshError({
    kind: "host-not-in-config",
    host,
    title: `Host '${host}' is not in ~/.ssh/config`,
    message: "There's no matching Host entry for this alias.",
    hint: 'Add a Host entry to ~/.ssh/config or pick another host in "Select Clusters".',
    raw: `resolveHost('${host}') returned null`,
  });
}

export async function showSshErrorToast(err: unknown, host?: string, context?: string): Promise<void> {
  const info = classifySshError(err, host);
  const title = context ? `${context}: ${info.title}` : info.title;
  await showFailureToast(info.hint ?? info.message, { title });
}
