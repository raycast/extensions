export function preprocessIngredients(input: string): string[] {
  let processed = input.replace(/\d+(\.\d+)?%/g, "").replace(/\b\w+\s+\d+/g, (match) => match.replace(/\d+$/, ""));

  function handleParentheses(str: string): string {
    return str.replace(/\(([^()]+)\)/g, (_, content) => {
      const items = content.split(",").map((item: string) => item.trim());
      return "," + items.join(",") + ",";
    });
  }

  while (processed.includes("(")) {
    processed = handleParentheses(processed);
  }

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
