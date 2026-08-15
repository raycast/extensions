export const parseBigInt = (string: string, radix: number): bigint | null => {
  if (string.length == 0) {
    return null;
  }
  let value = BigInt(0);
  for (const char of string) {
    const digit = parseInt(char, radix);
    if (isNaN(digit)) {
      return null;
    }
    value = value * BigInt(radix) + BigInt(digit);
  }
  return value;
};
