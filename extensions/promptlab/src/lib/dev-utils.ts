/**
 * @file Utility functions for development.
 */
import { environment } from "@raycast/api";
import * as util from "util";

/**
 * Severity levels of debug log messages.
 */
export enum DebugStyle {
  Info = "info",
  Warn = "warn",
  Error = "error",
  Trace = "trace",
}

/**
 * Logs a message to the console if the environment is in development mode.
 * @param msg The message to log.
 * @param severity The severity of the message, defaults to info.
 */
export const logDebug = (data: unknown, style = DebugStyle.Info) => {
  if (!environment.isDevelopment) return;
  switch (style) {
    case DebugStyle.Info:
      console.log(
        `[Debug] ${util.inspect(data, {
          showHidden: true,
          depth: null,
          compact: false,
          maxArrayLength: null,
          maxStringLength: null,
        })}`,
      );
      break;
    case DebugStyle.Warn:
      console.warn(
        `[Debug] ${util.inspect(data, {
          showHidden: true,
          depth: null,
          compact: false,
          maxArrayLength: null,
          maxStringLength: null,
        })}`,
      );
      break;
    case DebugStyle.Error:
      console.error(
        `[Debug] ${util.inspect(data, {
          showHidden: true,
          depth: null,
          compact: false,
          maxArrayLength: null,
          maxStringLength: null,
        })}`,
      );
      break;
    case DebugStyle.Trace:
      console.trace();
      logDebug(data, DebugStyle.Error);
      break;
  }
};
