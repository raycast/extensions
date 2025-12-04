import { environment } from "@raycast/api";
import { getErrorString } from "~/utils/errors";
import { captureException as captureExceptionRaycast } from "@raycast/api";

type Log = {
  message: string;
  error: any;
};

const _exceptions = {
  logs: new Map<Date, Log>(),
  set: (message: string, error?: any): void => {
    capturedExceptions.logs.set(new Date(), { message, error });
  },
  clear: (): void => capturedExceptions.logs.clear(),
  toString: (): string => {
    let str = "";
    capturedExceptions.logs.forEach((log, date) => {
      if (str.length > 0) str += "\n\n";
      str += `[${date.toISOString()}] ${log.message}`;
      if (log.error) str += `: ${getErrorString(log.error)}`;
    });

    return str;
  },
};

export const capturedExceptions = Object.freeze(_exceptions);

type CaptureExceptionOptions = {
  captureToRaycast?: boolean;
};

export const captureException = (
  description: string | Falsy | (string | Falsy)[],
  error: any,
  options?: CaptureExceptionOptions
) => {
  const { captureToRaycast = false } = options ?? {};
  const desc = Array.isArray(description) ? description.filter(Boolean).join(" ") : description || "Captured exception";
  capturedExceptions.set(desc, error);
  if (environment.isDevelopment) {
    console.error(desc, error);
  } else if (captureToRaycast) {
    captureExceptionRaycast(error);
  }
};

export const debugLog = (...args: any[]) => {
  if (!environment.isDevelopment) return;
  console.debug(...args);
};
