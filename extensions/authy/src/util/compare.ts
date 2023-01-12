export const toId = (v: string) => v.trim().toLocaleLowerCase();
export const compare = (a: string, b: string) => toId(a).localeCompare(toId(b));
