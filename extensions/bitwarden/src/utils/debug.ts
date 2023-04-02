import { ExecaError } from "execa";

export function treatError(error: unknown, options?: { omitSensitiveValue: string }) {
  try {
    const execaError = error as ExecaError;
    let errorString: string | undefined;
    if (execaError?.stderr) {
      errorString = execaError.stderr;
    } else if (typeof error === "object" && error !== null && !Array.isArray(error)) {
      errorString = JSON.stringify(error);
    } else {
      errorString = `${error}`;
    }

    if (!errorString) return "";
    if (!options?.omitSensitiveValue) return errorString;

    return omitSensitiveValueFromString(errorString, options.omitSensitiveValue);
  } catch {
    return "";
  }
}

export function omitSensitiveValueFromString(value: string, sensitiveValue: string) {
  return value.replace(new RegExp(sensitiveValue, "i"), "[REDACTED]");
}
