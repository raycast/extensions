const IS_FLOATING_NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/;

/**
 * Determine whether a string can be safely converted to a number.
 */
export function isNumberLike(v: string) {
  const numberLike = v.trim();

  if (Number.isNaN(Number(numberLike))) {
    return false;
  }

  if (!IS_FLOATING_NUMBER_REGEX.test(numberLike)) {
    return false;
  }

  return true;
}
