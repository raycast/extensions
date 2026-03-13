export const isBetween = (number: number, calc: [number, number]): boolean => {
  const [min, max] = calc;
  return number >= min && number <= max;
};
