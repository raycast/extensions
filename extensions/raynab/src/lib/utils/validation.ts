const IS_NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/g;

/**
 * Determine whether a string can be safely converted to a number.
 */
export function isNumber(v: string) {
  if (Number.isNaN(Number(v))) return false;

  if (!IS_NUMBER_REGEX.test(v)) return false;

  return true;
}
