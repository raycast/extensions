import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "@raycast/utils";

import { logScript } from "./logger";
import { ScriptError } from "./models";

function toScriptError(error: unknown, command: string): ScriptError {
  const cause = error instanceof Error ? error : new Error(String(error));
  return Object.assign(cause, { shortMessage: cause.message, command, failed: true });
}

export const runScript = (command: string) =>
  TE.tryCatch(
    () => runAppleScript(logScript(command), [], { timeout: 10_000 }),
    (error) => toScriptError(error, command),
  );

export const tell = (application: string, command: string) =>
  runScript(`tell application "${application}" to ${command}`);

export const escapeAppleScriptString = (value: string) =>
  value
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

/**
 * Transforms an object to a querystring concatened in apple-script.
 * @example
 *  createQueryString({
 *     id: 'trackId',
 *     name: 'trackName',
 *  }) // => "id=" & trackId & "&name=" & trackName"
 */
export const createQueryString = <T extends object>(obj: T): string => {
  return Object.entries(obj).reduce((acc, [key, value], i) => {
    const keyvalue = `"${i > 0 ? "$BREAK" : ""}${key}=" & ${value}`;

    if (!acc) return keyvalue;

    return `${acc} & ${keyvalue}`;
  }, "");
};

export const parseQueryString =
  <T>() =>
  (query: string): T => {
    return Object.fromEntries(
      query.split("$BREAK").flatMap((item) => {
        const separator = item.indexOf("=");
        return separator < 0 ? [] : [[item.slice(0, separator), item.slice(separator + 1)]];
      }),
    ) as T;
  };
