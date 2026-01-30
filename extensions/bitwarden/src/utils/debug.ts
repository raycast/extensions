import { ExecaError } from "execa";
import { isObject } from "~/utils/objects";

export function treatError(error: unknown, options?: { omitSensitiveValue: string }) {
  try {
    const execaError = error as ExecaError;
    let errorString: string | undefined;
    if (error instanceof Error) {
      // Include message first (execa puts full command there, which can contain passwords)
      errorString = `${error.name}: ${error.message}`;
      const stderrStr = typeof execaError?.stderr === "string" ? execaError.stderr : "";
      if (stderrStr && !errorString.includes(stderrStr)) {
        errorString += `\n${stderrStr}`;
      }
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

/** Escapes special regex characters so the string can be used literally in RegExp. */
function escapeForRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function omitSensitiveValueFromString(value: string, sensitiveValue: string) {
  if (!sensitiveValue) return value;
  return value.replace(new RegExp(escapeForRegExp(sensitiveValue), "gi"), "[REDACTED]");
}
