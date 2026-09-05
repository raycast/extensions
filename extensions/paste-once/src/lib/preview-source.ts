export function wrapAsSource(text: string, language = "markdown"): string {
  let ticks = 3;
  while (text.includes("`".repeat(ticks))) ticks += 1;
  const fence = "`".repeat(ticks);
  return `${fence}${language}\n${text}\n${fence}`;
}

export function reflowPreviewMarkdown(original: string, result: string): string {
  if (original === result) {
    return `Already clean. Nothing to join.\n\n${wrapAsSource(result)}`;
  }

  return `## After\n\n${wrapAsSource(result)}\n\n## Before\n\n${wrapAsSource(original)}`;
}
