export function commaUSStandard(n: string | number) {
  if (typeof n === "string") n = Number(n);
  if (n.toString().length <= 3) return n;
  return n.toLocaleString("en-US");
}

export function commaINStandard(n: string | number) {
  if (typeof n === "string") n = Number(n);
  if (n.toString().length <= 4) return n;
  return n.toLocaleString("en-IN");
}

export function countLastZeros(str: string) {
  if (typeof str !== "string") {
    throw new Error("for countZero() Input must be a string.");
  }

  let zeroCount = 0;
  for (let i = str.length - 1; i > 0; i--) {
    if (str[i] === "0") {
      zeroCount++;
    } else {
      break;
    }
  }
  return zeroCount;
}
