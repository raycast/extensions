import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";

import { logScript } from "./logger";
import { ScriptError } from "./models";

function toScriptError(e: unknown): ScriptError {
  return e as ScriptError;
}

export const runScript = (command: string) =>
  TE.tryCatch(() => pipe(command, logScript, runAppleScript), toScriptError);

export const tell = (application: string, command: string) =>
  runScript(`tell application "${application}" to ${command}`);

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
    return Object.fromEntries(query.split("$BREAK").map((item) => item.split("="))) as unknown as T;
  };
