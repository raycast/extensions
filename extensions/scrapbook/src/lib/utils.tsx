export function reactionReadableName(reactionName: string): string {
  const delimiter = reactionName.includes("-") ? "-" : reactionName.includes("_") ? "_" : null;
  if (delimiter) {
    return reactionName
      .split(delimiter)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return reactionName;
}
