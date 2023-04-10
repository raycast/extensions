const collator = new Intl.Collator(undefined, { sensitivity: "accent" });

export function strCmp(s1: string, s2: string) {
  return collator.compare(s1, s2);
}

export function strEq(s1: string, s2: string) {
  return strCmp(s1, s2) === 0;
}
