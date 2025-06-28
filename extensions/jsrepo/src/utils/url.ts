/*
	Installed from github/ieedan/std
*/

/** Joins the segments into a single url correctly handling leading and trailing slashes in each segment.
 *
 * @param segments
 * @returns
 *
 * ## Usage
 * ```ts
 * const url = join('https://example.com', '', 'api/', '/examples/');
 *
 * console.log(url); // https://example.com/api/examples
 * ```
 */
export function join(...segments: string[]): string {
	return segments
		.map((s) => removeLeadingAndTrailingSlash(s))
		.filter(Boolean)
		.join("/");
}

/** Removes the leading and trailing slash from the segment (if they exist)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = removeLeadingAndTrailingSlash('/example/');
 *
 * console.log(segment); // 'example'
 * ```
 */
export function removeLeadingAndTrailingSlash(segment: string): string {
	const newSegment = removeLeadingSlash(segment);
	return removeTrailingSlash(newSegment);
}

/** Adds a leading and trailing to the beginning and end of the segment (if it doesn't already exist)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = addLeadingAndTrailingSlash('example');
 *
 * console.log(segment); // '/example/'
 * ```
 */
export function addLeadingAndTrailingSlash(segment: string): string {
	// this is a weird case so feel free to handle it however you think it makes the most sense
	if (segment === "") return "//";

	const newSegment = addLeadingSlash(segment);
	return addTrailingSlash(newSegment);
}

/** Removes the leading slash from the beginning of the segment (if it exists)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = removeLeadingSlash('/example');
 *
 * console.log(segment); // 'example'
 * ```
 */
export function removeLeadingSlash(segment: string): string {
	let newSegment = segment;
	if (newSegment.startsWith("/")) {
		newSegment = newSegment.slice(1);
	}

	return newSegment;
}

/** Adds a leading slash to the beginning of the segment (if it doesn't already exist)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = addLeadingSlash('example');
 *
 * console.log(segment); // '/example'
 * ```
 */
export function addLeadingSlash(segment: string): string {
	let newSegment = segment;
	if (!newSegment.startsWith("/")) {
		newSegment = `/${newSegment}`;
	}

	return newSegment;
}

/** Removes the trailing slash from the end of the segment (if it exists)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = removeTrailingSlash('example/');
 *
 * console.log(segment); // 'example'
 * ```
 */
export function removeTrailingSlash(segment: string): string {
	let newSegment = segment;
	if (newSegment.endsWith("/")) {
		newSegment = newSegment.slice(0, newSegment.length - 1);
	}

	return newSegment;
}

/** Adds a trailing slash to the end of the segment (if it doesn't already exist)
 *
 * @param segment
 * @returns
 *
 * ## Usage
 * ```ts
 * const segment = addTrailingSlash('example');
 *
 * console.log(segment); // 'example/'
 * ```
 */
export function addTrailingSlash(segment: string): string {
	let newSegment = segment;
	if (!newSegment.endsWith("/")) {
		newSegment = `${newSegment}/`;
	}

	return newSegment;
}

/** Removes the last segment of the url.
 *
 * @param url
 *
 * ## Usage
 * ```ts
 * const url = upOneLevel('/first/second');
 *
 * console.log(url); // '/first'
 * ```
 */
export function upOneLevel(url: string): string {
	if (url === "/") return url;

	const lastIndex = removeTrailingSlash(url).lastIndexOf("/");

	return url.slice(0, url.length - lastIndex - 1);
}
