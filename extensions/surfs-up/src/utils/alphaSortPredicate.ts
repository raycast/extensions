import { Spot } from "../types/spot";

export function alphaSortPredicate(a: Spot, b: Spot) {
  if (a.location < b.location) {
    return -1;
  }
  if (a.location > b.location) {
    return 1;
  }
  return 0;
}
