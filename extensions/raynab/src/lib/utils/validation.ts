const IS_FLOATING_NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/;

/**
 * Determine whether a string can be safely converted to a number.
 */
export function isNumberLike(v: string) {
  const numberLike = v.trim();

  if (Number.isNaN(Number(numberLike))) {
    console.log(`${numberLike} is not a number`);
    return false;
  }

  if (!IS_FLOATING_NUMBER_REGEX.test(numberLike)) {
    console.log(`${numberLike} is not matching regex`);
    return false;
  }

  return true;
}
