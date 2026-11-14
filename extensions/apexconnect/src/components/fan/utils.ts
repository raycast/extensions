export function getFanSpeedValues(step: number): number[] {
  const result: number[] = [];
  for (let i = 100; i >= 0; i = i - step) {
    result.push(i);
  }

  return result;
}
