import { environment } from "@raycast/api";
import { getErrorString } from "~/utils/errors";

type Log = {
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
};

const _exceptions = {
  logs: new Map<Date, Log>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debugLog = (...args: any[]) => {
  if (!environment.isDevelopment) return;
  console.debug(...args);
};
