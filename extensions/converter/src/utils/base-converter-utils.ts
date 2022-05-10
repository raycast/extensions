export const buildBases = () => {
  const bases: { title: string; value: string }[] = [];
  for (let i = 2; i <= 36; i++) {
    bases.push({ title: i + "", value: i + "" });
  }
  return bases;
};

export const baseToBase = (input: string, fromBase: string, toBase: string) => {
  let base10 = parseInt(input.trim(), parseInt(fromBase));
  if (isNaN(base10)) {
    base10 = 0;
  }
  return base10.toString(parseInt(toBase));
};
