import type { RandomFactEvent, RandomFactSource } from "./types";

export function formatRandomFactMarkdown(source: RandomFactSource, event: RandomFactEvent): string {
  const sections = [`# ${event.title}`];

  if (event.year) {
    sections.push("", `**Year:** ${event.year}`);
  }

  if (event.description && event.description !== event?.year) {
    sections.push("", event.description);
  }

  sections.push("", `---`, `**Source:** ${source.name}`);

  return sections.join("\n");
}

export function formatRandomFactEmptyMarkdown(source: RandomFactSource): string {
  return [`# No fact found`, "", `${source.name} did not return any content this time.`].join("\n");
}

export function formatRandomFactErrorMarkdown(sourceName: string | undefined, message: string): string {
  const heading = sourceName ? `# Unable to load ${sourceName}` : "# Unable to load Random Fact";

  return [heading, "", message].join("\n");
}
