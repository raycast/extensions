type AppleScriptError = {
  message: string;
  shortMessage: string;
  command: string;
  exitCode: number;
  signal: null;
  stdout: string;
  stderr: string;
};

function isAppleScriptError(error: unknown): error is AppleScriptError {
  return (
    !!error &&
    typeof error === "object" &&
    "message" in error &&
    "shortMessage" in error &&
    "command" in error &&
    "exitCode" in error &&
    "signal" in error &&
    "stdout" in error &&
    "stderr" in error
  );
}

export function isNoActiveTaskError(error: unknown) {
  return isAppleScriptError(error) && error.message.includes("No active task");
}

export function isNoActiveTimerToToggleError(error: unknown) {
  return isAppleScriptError(error) && error.message.includes("There was no active timer to toggle");
}
