export const getMinMax = (a: number, b: number): { min: number; max: number } => {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return { min, max };
};