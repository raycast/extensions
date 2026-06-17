export const toId = (v: string) => v.trim().toLocaleLowerCase();
export const compareByName = (a: string, b: string) =>
  toId(a).localeCompare(toId(b));
export const compareByDate = (a: number, b: number) => b - a;
