export type LatestTurn = {
  heading: string;
  body: string;
  order: number;
};

function createTextCodeBlock(value: string): string {
  return `\`\`\`text\n${value.replaceAll("```", "``\\`")}\n\`\`\``;
}

export function renderLatestTurnsMarkdown(turns: LatestTurn[]): string {
  return turns
    .flatMap((turn, index) => [
      `### ${turn.heading}`,
      "",
      createTextCodeBlock(turn.body),
      ...(index === turns.length - 1 ? [] : [""]),
    ])
    .join("\n");
}

export function getLatestTurnsLoadingOrErrorMarkdown(
  isLoading: boolean,
  error?: Error,
): string | null {
  if (error) {
    return `_Unable to load latest turns._\n\n${error.message}`;
  }

  if (isLoading) {
    return "_Loading latest turns…_";
  }

  return null;
}
