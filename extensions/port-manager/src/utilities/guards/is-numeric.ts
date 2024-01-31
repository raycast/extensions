import isStringBlank from "./is-string-blank";

type Numeric = number | `${number}`;

/**
 * Returns `true` if the value is a numeric string or a number, else returns `false`
 *
 * @remark Original {@link https://github.com/plotly/fast-isnumeric/blob/master/index.js source on GitHub}
 *
 * @remark This functions does not recocgnize object numbers and strings like
 * `new Number(1)` or `new String('1')`. This was a deliberate choice to improve
 * performance.
 *
 * @example
 * isNumeric('1') // true
 * isNumeric(1) // true
 * isNumeric('1.1') // true
 * isNumeric(1.1) // true
 * isNumeric('1e5') // true
 * isNumeric(1e5) // true
 * isNumeric('') // false
 * isNumeric('   ') // false
 * isNumeric('foo') // false
 * isNumeric('1foo') // false
 * isNumeric(NaN) // false
 * isNumeric(Infinity) // false
 * isNumeric(new Number(1)) // false
 * isNumeric(new String('1')) // false
 */
function isNumeric(n: unknown): n is number | `${number}` {
  if (typeof n === "string") {
    const original = n;
    n = +n;
    // whitespace strings cast to zero - filter them out
    if (n === 0 && isStringBlank(original)) return false;
  }

  if (typeof n === "number") {
    return n - n < 1;
  }

  return false;
}

export { isNumeric, type Numeric };
