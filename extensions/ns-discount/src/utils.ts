export function calcCutoff(cutoff: number) {
  let zhDiscount = "";
  if (cutoff) {
    const x = 100 - Number(cutoff);
    zhDiscount = (x / 10).toFixed(1);
  }
  return zhDiscount;
}
