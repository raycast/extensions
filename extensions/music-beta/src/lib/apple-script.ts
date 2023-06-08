import { pipe, flow } from "fp-ts/function";
import * as A from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";

import { debug } from "./logger";
import { ScriptError } from "../models/types";

/**
 *
 * Force the type of the error to be a {ScriptError}.
 */
function asScriptError(error: unknown) {
	return error as ScriptError;
}

export const runScript = (command: string) =>
	TE.tryCatch(() => {
		debug(`Running AppleScript:\n\n ${command}`);
		return runAppleScript(command);
	}, asScriptError);

export const tell = (application: string, command: string) => {
	const script = `tell application "${application}" to ${command}`;
	return runScript(script);
};

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
		const entries = query.split("$BREAK").map((item) => item.split("="));

		const o: any = {};

		for (const [k, v] of entries) {
			o[k] = parseValue(v);
		}

		return o as T;
	};

const parseValue = (value: string) => {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
};

/**
 *
 * use to parse run-applescript return (string)
 * see start - `playlist.tsx` for a full example
 */
// prettier-ignore
export const parseResult = <T extends object>() => (raw: string): ReadonlyArray<T> => pipe(
	raw,
	S.trim,
	S.split("\n"),
	A.map(flow(
		S.trim,
		parseQueryString<T>()
	))
);
