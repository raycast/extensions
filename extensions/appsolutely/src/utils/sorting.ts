const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function byName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}

export function byOrderThenName(a: { name: string; order: number }, b: { name: string; order: number }): number {
  return a.order - b.order || byName(a, b);
}
