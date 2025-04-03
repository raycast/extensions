/*
	Installed from github/ieedan/std
*/

import { stripVTControlCharacters as stripAsni } from "node:util";

/** Adds the `padWith` (default `' '`) to the string the amount of times specified by the `space` argument
 *
 * @param str String to add padding to
 * @param space Whitespace to add
 * @param padWith Character to use to pad the string
 * @returns
 *
 * ## Usage
 * ```ts
 * const padded = leftPad("Hello", 3, ".");
 *
 * console.log(padded); // '...Hello'
 * ```
 */
export function leftPad(str: string, space: number, padWith = " "): string {
	return padWith.repeat(space) + str;
}

/** Adds the `padWith` until the string length matches the `length`
 *
 * @param str
 * @param length
 * @param padWith
 *
 * ## Usage
 * ```ts
 * const padded = leftPadMin("1", 3, ".");
 *
 * console.log(padded); // '..1'
 * ```
 */
export function leftPadMin(str: string, length: number, padWith = " "): string {
	const strippedLength = stripAsni(str).length;
	if (strippedLength > length)
		throw new Error("String length is greater than the length provided.");

	return padWith.repeat(length - strippedLength) + str;
}

/** Adds the `padWith` (default `' '`) to the string the amount of times specified by the `space` argument
 *
 * @param str String to add padding to
 * @param space Whitespace to add
 * @param padWith Character to use to pad the string
 * @returns
 *
 * ## Usage
 * ```ts
 * const padded = rightPad("Hello", 3, ".");
 *
 * console.log(padded); // 'Hello...'
 * ```
 */
export function rightPad(str: string, space: number, padWith = " "): string {
	return str + padWith.repeat(space);
}

/** Adds the `padWith` until the string length matches the `length`
 *
 * @param str
 * @param length
 * @param padWith
 *
 * ## Usage
 * ```ts
 * const padded = rightPadMin("1", 3, ".");
 *
 * console.log(padded); // '1..'
 * ```
 */
export function rightPadMin(
	str: string,
	length: number,
	padWith = " ",
): string {
	if (stripAsni(str).length > length)
		throw new Error("String length is greater than the length provided.");

	return str + padWith.repeat(length - stripAsni(str).length);
}

/** Pads the string with the `padWith` so that it appears in the center of a new string with the provided length.
 *
 * @param str
 * @param length
 * @param padWith
 * @returns
 *
 * ## Usage
 * ```ts
 * const str = "Hello, World!";
 *
 * const padded = centerPad(str, str.length + 4);
 *
 * console.log(padded); // '  Hello, World!  '
 * ```
 */
export function centerPad(str: string, length: number, padWith = " "): string {
	if (stripAsni(str).length > length) {
		throw new Error("String length is greater than the length provided.");
	}

	const overflow = length - stripAsni(str).length;

	const paddingLeft = Math.floor(overflow / 2);

	const paddingRight = Math.ceil(overflow / 2);

	return padWith.repeat(paddingLeft) + str + padWith.repeat(paddingRight);
}
