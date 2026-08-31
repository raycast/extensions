import { MINIMUM_PROMPTTY_VERSION } from "./compatibility.js";

export type SnapshotErrorKind =
  | "missing"
  | "permission"
  | "malformed"
  | "incompatible"
  | "unsupportedPrompttyVersion"
  | "unavailable";

export class SnapshotError extends Error {
  constructor(
    public readonly kind: SnapshotErrorKind,
    message: string,
    public readonly schemaVersion?: number,
    public readonly appVersion?: string,
  ) {
    super(message);
    this.name = "SnapshotError";
  }
}

export function snapshotErrorFromFileSystem(error: unknown): SnapshotError {
  const code = isNodeError(error) ? error.code : undefined;

  if (code === "ENOENT") {
    return new SnapshotError("missing", "The Promptty snapshot does not exist.");
  }
  if (code === "EACCES" || code === "EPERM") {
    return new SnapshotError("permission", "Raycast cannot read the Promptty snapshot.");
  }
  return new SnapshotError("unavailable", "The Promptty snapshot could not be read.");
}

export function emptyStateCopy(error: SnapshotError): { title: string; description: string } {
  switch (error.kind) {
    case "missing":
      return {
        title: "Open Promptty",
        description: `Open Promptty for Mac ${MINIMUM_PROMPTTY_VERSION} or later once so it can create the local snapshot this command reads. If Promptty is missing or outdated, update it from the App Store first.`,
      };
    case "permission":
      return {
        title: "Local Access Required",
        description:
          "Raycast cannot access Promptty’s local export. Grant access if macOS prompts you, or select prompts-v1.json in this command’s Snapshot File preference.",
      };
    case "incompatible":
      return {
        title: "Update the Promptty Extension",
        description: "This snapshot uses a newer schema. Update Promptty for Raycast and try again.",
      };
    case "unsupportedPrompttyVersion":
      return {
        title: "Update Promptty for Mac",
        description: error.appVersion
          ? `This export came from Promptty ${error.appVersion}. Update to Promptty ${MINIMUM_PROMPTTY_VERSION} or later, then open the app once.`
          : `Promptty ${MINIMUM_PROMPTTY_VERSION} or later is required. Update Promptty for Mac, then open the app once.`,
      };
    case "malformed":
      return {
        title: "Promptty Snapshot Is Invalid",
        description: "Open Promptty for Mac to create a fresh local snapshot.",
      };
    case "unavailable":
      return {
        title: "Promptty Snapshot Unavailable",
        description: "Open Promptty for Mac and try again.",
      };
    default: {
      const _exhaustive: never = error.kind;
      return _exhaustive;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
