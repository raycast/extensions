export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function filterNullishPropertiesFromObject(obj: any): any {
  if (!obj) return obj;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const newEntries = Object.entries(obj).filter(([_, value]) => {
    const nullish = value ?? null;
    return nullish !== null;
  });

  return Object.fromEntries(newEntries);
}
