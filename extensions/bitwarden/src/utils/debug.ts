import { ExecaError } from "execa";
import { isObject } from "~/utils/objects";

export function treatError(error: unknown, options?: { omitSensitiveValue: string }) {
  try {
    const execaError = error as ExecaError;
    let errorString: string | undefined;
    if (execaError?.stderr) {
      errorString = execaError.stderr;
    } else if (error instanceof Error) {
      errorString = `${error.name}: ${error.message}`;
    } else if (isObject(error)) {
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
