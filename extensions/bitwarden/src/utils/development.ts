import { environment } from "@raycast/api";
import { getErrorString } from "~/utils/errors";

type Log = {
  message: string;
  error: any;
};

const _exceptions = {
  logs: new Map<Date, Log>(),
  set: (message: string, error: any): void => {
    capturedExceptions.logs.set(new Date(), { message, error });
  },
  clear: (): void => capturedExceptions.logs.clear(),
  toString: (): string => {
    let str = "";
    capturedExceptions.logs.forEach((log, date) => {
      if (str.length > 0) str += "\n\n";
      str += `[${date.toISOString()}] ${log.message}: ${getErrorString(log.error)}`;
    });

    return str;
  },
};

export const capturedExceptions = Object.freeze(_exceptions);

export const captureException = (description: string, error: any) => {
  capturedExceptions.set(description, error);
  if (!environment.isDevelopment) return;
  console.error(description, error);
};

export const debugLog = (...args: any[]) => {
  if (!environment.isDevelopment) return;
  console.debug(...args);
};
