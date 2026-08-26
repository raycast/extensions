// Typed error taxonomy for the yerd CLI bridge. Every class carries a
// `userMessage` suitable for direct display in Raycast toasts — never a raw
// stack trace or exit-code dump.

export class YerdNotInstalledError extends Error {
  readonly userMessage: string;
  constructor(path?: string) {
    const msg = path
      ? `Yerd CLI not found at "${path}". Go to Yerd Settings → Terminal CLI → Install, or set the yerdPath preference.`
      : "Yerd CLI not found. Go to Yerd Settings → Terminal CLI → Install, or set the yerdPath preference.";
    super(msg);
    this.name = "YerdNotInstalledError";
    this.userMessage = msg;
  }
}

export class DaemonUnreachableError extends Error {
  readonly userMessage = "Yerd daemon is not running — open the Yerd app.";
  constructor() {
    super("Yerd daemon is not running");
    this.name = "DaemonUnreachableError";
  }
}

export class YerdUsageError extends Error {
  readonly userMessage: string;
  constructor(detail: string) {
    super(detail);
    this.name = "YerdUsageError";
    this.userMessage = detail || "Invalid command arguments.";
  }
}

export class YerdDaemonError extends Error {
  readonly userMessage: string;
  constructor(detail: string) {
    super(detail);
    this.name = "YerdDaemonError";
    this.userMessage = detail || "Yerd returned an error.";
  }
}

export class YerdTransportError extends Error {
  readonly userMessage =
    "Yerd IPC transport error — try restarting the Yerd app.";
  constructor(detail: string) {
    super(detail);
    this.name = "YerdTransportError";
  }
}

export class YerdParseError extends Error {
  readonly userMessage =
    "Unexpected response from Yerd — check that your Yerd version is supported.";
  constructor(snippet: string) {
    super(`JSON parse failed: ${snippet}`);
    this.name = "YerdParseError";
  }
}

export class YerdTimeoutError extends Error {
  readonly userMessage = "Yerd command timed out.";
  constructor(cmd: string) {
    super(`Command timed out: ${cmd}`);
    this.name = "YerdTimeoutError";
  }
}
