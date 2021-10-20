export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function filterNullishPropertiesFromObject(obj: any): any {
  if (!obj) return obj;
  const noNullish: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key) && (obj[key] ?? false)) {
      noNullish[key] = obj[key];
    }
  }

  return noNullish;
}

export function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
