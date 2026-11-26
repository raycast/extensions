/**
 * VmtError carries the two halves Raycast shows separately: a title short
 * enough for a toast, and the detail that says what to do about it.
 */
export class VmtError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "VmtError";
  }
}

/**
 * stderrMessage pulls vmt's own error line out of its output. Cobra prints
 * "Error: <what went wrong>", and everything around it is noise to a user
 * looking at a Raycast toast.
 */
export function stderrMessage(stderr: string): string {
  const lines = stderr.split("\n").map((line) => line.trim());
  const reported = lines.find((line) => line.startsWith("Error:"));
  return (reported ?? lines.find((line) => line.length > 0) ?? "").replace(/^Error:\s*/, "");
}

/**
 * describeFailure turns a failed vmt run into the error to surface. The Voice
 * Memos container is TCC-protected and Raycast has no Full Disk Access by
 * default, so that denial is by far the most common first failure and is worth
 * answering with the fix rather than the message.
 */
export function describeFailure(command: string, stderr: string): VmtError {
  const detail = stderrMessage(stderr);
  if (detail.includes("Full Disk Access")) {
    return new VmtError(
      "Raycast cannot read Voice Memos",
      "Grant Raycast Full Disk Access in System Settings → Privacy & Security, then relaunch Raycast.",
    );
  }
  if (detail) {
    return new VmtError(detail);
  }
  return new VmtError(`vmt ${command} failed`);
}
