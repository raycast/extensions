export function preprocessIngredients(input: string): string[] {
  const processed = input
    .replace(/\d+(\.\d+)?%/g, "")
    .replace(/\b\w+\s+\d+/g, (match) => match.replace(/\d+$/, ""))
    .replace(/:/g, ",");

  return processed
    .split(",")
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .reduce((acc, item) => {
      const parts = item.split(/\s+(?=\()/).map((part) => part.replace(/[()]/g, "").trim());
      return acc.concat(parts);
    }, [] as string[])
    .filter(
      (item, index, self) =>
        self.indexOf(item) === index &&
        !self.some((other, otherIndex) => otherIndex !== index && other.includes(item) && other !== item),
    );
}
