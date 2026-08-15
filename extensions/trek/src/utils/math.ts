export function calculateCompletedRatio(completedRatio: string) {
  // between 0 and 1
  const split = completedRatio.split("/");
  const calc = parseInt(split[0]) / parseInt(split[1]);
  return Number(calc.toFixed(1));
}
