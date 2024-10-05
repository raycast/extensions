export function preprocessIngredients(input: string): string[] {
  // Remove percentages and numbers immediately following words
  let processed = input
    .replace(/\d+(\.\d+)?%/g, "")
    .replace(/\b\w+\s+\d+/g, (match) => match.replace(/\d+$/, ""));

  // Function to handle nested parentheses
  function handleParentheses(str: string): string {
    return str.replace(/\(([^()]+)\)/g, (_, content) => {
      const items = content.split(",").map((item: string) => item.trim());
      return "," + items.join(",") + ",";
    });
  }

  // Apply parentheses handling repeatedly to catch nested cases
  while (processed.includes("(")) {
    processed = handleParentheses(processed);
  }

  // Split by comma, trim, remove trailing dots, and filter out empty strings
  return (
    processed
      .split(",")
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter(Boolean)
      .reduce((acc, item) => {
        // Split compound ingredients
        const parts = item
          .split(/\s+(?=\()/)
          .map((part) => part.replace(/[()]/g, "").trim());
        return acc.concat(parts);
      }, [] as string[])
      // Remove duplicates and items that are substrings of others
      .filter(
        (item, index, self) =>
          self.indexOf(item) === index &&
          !self.some(
            (other, otherIndex) =>
              otherIndex !== index && other.includes(item) && other !== item,
          ),
      )
  );
}
