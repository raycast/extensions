import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";
import { logScript } from "./logger";
import { URLSearchParams } from "url";

export const runScript = (command: string) => TE.tryCatch(() => pipe(command, logScript, runAppleScript), E.toError);
export const tell = (application: string, command: string) =>
  runScript(`tell application "${application}" to ${command}`);

/**
 * Transforms an object to a querystring concatened in apple-script.
 * @example
 *  objectToString({
 *     id: 'trackId',
 *     name: 'trackName',
 *  }) // => "id=" & trackId & "name=" & trackName"
 */
export const createQueryString = <T extends object>(obj: T): string => {
  return Object.entries(obj).reduce((acc, [key, value], i) => {
    const keyvalue = `"${i > 0 ? "&" : ""}${key}=" & ${value}`;

    if (!acc) return keyvalue;

    return `${acc} & ${keyvalue}`;
  }, "");
};

// prettier-ignore
export const parseQueryString = <T = any>() =>(querystring: string): T => Object.fromEntries(new URLSearchParams(querystring)) as unknown as T
