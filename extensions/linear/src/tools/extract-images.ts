type Input = { markdown: string };

export default async function extractImages({ markdown }: Input) {
  const images = new Map<string, { url: string; alt?: string; title?: string }>();
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g)) {
    images.set(match[2], { url: match[2], alt: match[1] || undefined, title: match[3] || undefined });
  }
  for (const match of markdown.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    const alt = match[0].match(/\salt=["']([^"']*)["']/i)?.[1];
    images.set(match[1], { url: match[1], alt });
  }
  return [...images.values()];
}
