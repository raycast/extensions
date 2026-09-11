import { Toast, showToast } from "@raycast/api";

type KlackErrorKind = "not-installed" | "needs-update" | "permission-denied" | "unknown";

export class KlackError extends Error {
  constructor(
    public readonly kind: KlackErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "KlackError";
  }
}

export function classifyAppleScriptError(err: unknown): KlackError {
  const message = err instanceof Error ? err.message : String(err);

  if (/-1743|not allowed|not authorized/i.test(message)) {
    return new KlackError(
      "permission-denied",
      "Raycast needs permission to control Klack. Open System Settings → Privacy & Security → Automation and enable Klack for Raycast.",
    );
  }

  if (/Expected end of line|isn't part of|doesn't understand|Bad parameter/i.test(message)) {
    return new KlackError("needs-update", "Open the Mac App Store and install the latest version of Klack.");
  }

  return new KlackError("unknown", message || "Couldn't talk to Klack.");
}

const TITLES: Record<KlackErrorKind, string> = {
  "not-installed": "Klack is not installed",
  "needs-update": "Klack needs an update",
  "permission-denied": "Klack permission required",
  unknown: "Couldn't reach Klack",
};

export async function reportError(err: unknown) {
  const klackErr =
    err instanceof KlackError ? err : new KlackError("unknown", err instanceof Error ? err.message : String(err));
  await showToast({ style: Toast.Style.Failure, title: TITLES[klackErr.kind], message: klackErr.message });
}
