/*
	Installed from github/ieedan/std
*/

import os from "node:os";
import { leftPadMin } from "./pad";

/** Regex used to split on new lines
 *
 * ```
 * /\n|\r\n/g
 * ```
 */
export const NEW_LINE_REGEX = /\n|\r\n/g;

/** Splits str into an array of lines.
 *
 * @param str
 * @returns
 *
 * ## Usage
 *
 * ```ts
 * lines.split("hello\\nhello\nhello"); // ["hello\\nhello", "hello"]
 * ```
 */
export function get(str: string): string[] {
	return str.split(NEW_LINE_REGEX);
}

export type Options = {
	lineNumbers: boolean;
	prefix: (line: number, lineCount: number) => string;
};

/** Joins the array of lines back into a string using the platform specific EOL.
 *
 * @param lines
 * @returns
 *
 * ## Usage
 *
 * ```ts
 * lines.join(["1", "2", "3"]); // "1\n2\n3" or on windows "1\r\n2\r\n3"
 *
 * // add line numbers
 * lines.join(["import { } from '.'", "console.log('test')"], { lineNumbers: true });
 * // 1 import {  } from '.'
 * // 2 console.log('test')
 *
 * // add a custom prefix
 * lines.join(["import { } from '.'", "console.log('test')"], { prefix: () => " + " });
 * // + import {  } from '.'
 * // + console.log('test')
 * ```
 */
export function join(
	lines: string[],
	{ lineNumbers = false, prefix }: Partial<Options> = {},
): string {
	let transformed = lines;

	if (lineNumbers) {
		const length = lines.length.toString().length + 1;

		transformed = transformed.map(
			(line, i) => `${leftPadMin(`${i + 1}`, length)} ${line}`,
		);
	}

	if (prefix !== undefined) {
		transformed = transformed.map(
			(line, i) => `${prefix(i, lines.length)}${line}`,
		);
	}

	return transformed.join(os.EOL);
}
