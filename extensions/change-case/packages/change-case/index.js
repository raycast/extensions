"use strict";
exports.trainCase = exports.snakeCase = exports.sentenceCase = exports.pathCase = exports.kebabCase = exports.dotCase = exports.constantCase = exports.capitalCase = exports.pascalSnakeCase = exports.pascalCase = exports.camelCase = exports.split = exports.noCase = void 0;
/**
 * Convert a string to space separated lower case (`foo bar`).
 */
function noCase(input, options) {
    return split(input, options)
        .map(lowerFactory(options?.locale))
        .join(" ");
}
exports.noCase = noCase;
// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
const SPLIT_NUMBER_LOWER_RE = /(\d)(\p{Ll})/gu;
const SPLIT_LETTER_NUMBER_RE = /(\p{L})(\d)/gu;
// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
// The replacement value for splits.
const SPLIT_REPLACE_VALUE = "$1\0$2";
/**
 * Split any cased input strings into an array of words.
 */
function split(input, options = {}) {
    let result = input
        .replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
        .replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
    if (options.separateNumbers) {
        result = result
            .replace(SPLIT_NUMBER_LOWER_RE, SPLIT_REPLACE_VALUE)
            .replace(SPLIT_LETTER_NUMBER_RE, SPLIT_REPLACE_VALUE);
    }
    result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
    let start = 0;
    let end = result.length;
    // Trim the delimiter from around the output string.
    while (result.charAt(start) === "\0")
        start++;
    if (start === end)
        return [];
    while (result.charAt(end - 1) === "\0")
        end--;
    // Transform each token independently.
    return result.slice(start, end).split(/\0/g);
}
exports.split = split;
/**
 * Convert a string to camel case (`fooBar`).
 */
function camelCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = pascalCaseTransformFactory(lower, upper);
    return split(input, options)
        .map((word, index) => {
        if (index === 0)
            return lower(word);
        return transform(word, index);
    })
        .join("");
}
exports.camelCase = camelCase;
/**
 * Convert a string to pascal case (`FooBar`).
 */
function pascalCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    return split(input, options)
        .map(pascalCaseTransformFactory(lower, upper))
        .join("");
}
exports.pascalCase = pascalCase;
/**
 * Convert a string to pascal snake case (`Foo_Bar`).
 */
function pascalSnakeCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    return split(input, options)
        .map(capitalCaseTransformFactory(lower, upper))
        .join("_");
}
exports.pascalSnakeCase = pascalSnakeCase;
/**
 * Convert a string to capital case (`Foo Bar`).
 */
function capitalCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    return split(input, options)
        .map(capitalCaseTransformFactory(lower, upper))
        .join(" ");
}
exports.capitalCase = capitalCase;
/**
 * Convert a string to constant case (`FOO_BAR`).
 */
function constantCase(input, options) {
    const upper = upperFactory(options?.locale);
    return split(input, options).map(upper).join("_");
}
exports.constantCase = constantCase;
/**
 * Convert a string to dot case (`foo.bar`).
 */
function dotCase(input, options) {
    const lower = lowerFactory(options?.locale);
    return split(input, options).map(lower).join(".");
}
exports.dotCase = dotCase;
/**
 * Convert a string to kebab case (`foo-bar`).
 */
function kebabCase(input, options) {
    const lower = lowerFactory(options?.locale);
    return split(input, options).map(lower).join("-");
}
exports.kebabCase = kebabCase;
/**
 * Convert a string to path case (`foo/bar`).
 */
function pathCase(input, options) {
    const lower = lowerFactory(options?.locale);
    return split(input, options).map(lower).join("/");
}
exports.pathCase = pathCase;
/**
 * Convert a string to path case (`Foo bar`).
 */
function sentenceCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = capitalCaseTransformFactory(lower, upper);
    return split(input, options)
        .map((word, index) => {
        if (index === 0)
            return transform(word);
        return lower(word);
    })
        .join(" ");
}
exports.sentenceCase = sentenceCase;
/**
 * Convert a string to snake case (`foo_bar`).
 */
function snakeCase(input, options) {
    const lower = lowerFactory(options?.locale);
    return split(input, options).map(lower).join("_");
}
exports.snakeCase = snakeCase;
/**
 * Convert a string to header case (`Foo-Bar`).
 */
function trainCase(input, options) {
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    return split(input, options)
        .map(capitalCaseTransformFactory(lower, upper))
        .join("-");
}
exports.trainCase = trainCase;
function lowerFactory(locale) {
    return locale === false
        ? (input) => input.toLowerCase()
        : (input) => input.toLocaleLowerCase(locale);
}
function upperFactory(locale) {
    return locale === false
        ? (input) => input.toUpperCase()
        : (input) => input.toLocaleUpperCase(locale);
}
function capitalCaseTransformFactory(lower, upper) {
    return (word) => `${upper(word[0])}${lower(word.slice(1))}`;
}
function pascalCaseTransformFactory(lower, upper) {
    return (word, index) => {
        const char0 = word[0];
        const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0);
        return initial + lower(word.slice(1));
    };
}
//# sourceMappingURL=index.js.map
