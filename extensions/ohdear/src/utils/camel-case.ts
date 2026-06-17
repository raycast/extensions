export function camelCaseToWords(text: string) {
  const brokenWords = text.replace(/([A-Z])/g, " $1");
  return brokenWords.charAt(0).toUpperCase() + brokenWords.slice(1);
}

export function camelize(text: string) {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word: string, index: number) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}
