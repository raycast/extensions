export const buildBases = () => {
  const bases: { title: string; value: string }[] = [];
  for (let i = 2; i <= 36; i++) {
    bases.push({ title: i + "", value: i + "" });
  }
  return bases;
};

export const baseToBaseBigInt = (input: string, fromBase: string, toBase: string): string => {
  const fromBaseNum = parseInt(fromBase);
  const toBaseNum = parseInt(toBase);
  if (
    isNaN(fromBaseNum) ||
    fromBaseNum < 2 ||
    fromBaseNum > 36 ||
    isNaN(toBaseNum) ||
    toBaseNum < 2 ||
    toBaseNum > 36
  ) {
    return "";
  }

  try {
    let bigIntValue = BigInt("0");
    for (const char of input.trim()) {
      bigIntValue = bigIntValue * BigInt(fromBaseNum) + BigInt(parseInt(char, fromBaseNum));
      if (isNaN(Number(bigIntValue))) {
        throw new Error("Invalid input number");
      }
    }

    return bigIntValue.toString(toBaseNum);
  } catch (error) {
    return "";
  }
};

export function safeBigIntConverter(baseString: string) {
  try {
    return BigInt(baseString);
  } catch (error) {
    return BigInt(0);
  }
}
