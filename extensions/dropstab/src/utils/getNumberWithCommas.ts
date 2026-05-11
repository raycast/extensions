// src/utils/getNumberWithCommas.ts
export function getNumberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
