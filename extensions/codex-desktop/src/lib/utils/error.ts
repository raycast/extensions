export function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "stderr" in error &&
    typeof error.stderr === "string"
  ) {
    const stderr = error.stderr.trim();
    if (stderr) {
      return stderr.split("\n").at(-1) ?? stderr;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
