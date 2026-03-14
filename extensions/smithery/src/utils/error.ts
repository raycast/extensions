type ErrorWithOutput = Error & {
  code?: number | string;
  stdout?: string;
  stderr?: string;
};

const MAX_TOAST_LENGTH = 300;

function truncateForToast(message: string): string {
  if (message.length <= MAX_TOAST_LENGTH) {
    return message;
  }
  return `${message.slice(0, MAX_TOAST_LENGTH)}...`;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (error instanceof Error) {
    const details = error.message?.trim();
    return truncateForToast(details || fallback);
  }

  if (typeof error === "string") {
    const details = error.trim();
    return truncateForToast(details || fallback);
  }

  return fallback;
}

export function getCommandErrorMessage(
  error: unknown,
  fallback = "Command failed.",
): string {
  if (!(error instanceof Error)) {
    return getErrorMessage(error, fallback);
  }

  const withOutput = error as ErrorWithOutput;
  const stderr = withOutput.stderr?.trim();
  const stdout = withOutput.stdout?.trim();

  if (stderr) {
    return truncateForToast(stderr);
  }

  if (stdout) {
    return truncateForToast(stdout);
  }

  return getErrorMessage(error, fallback);
}
