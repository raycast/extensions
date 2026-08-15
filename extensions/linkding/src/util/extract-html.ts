export const extractTitle = (html: string): string | undefined => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1].trim();
};

export const extractDescription = (html: string): string | undefined => {
  // find a meta tag where name="description" or property="og:description"
  const metaMatch = html.match(/<meta[^>]+(?:name|property)\s*=\s*["'](?:description|og:description)["'][^>]*>/i);
  if (!metaMatch) return;
  const tag = metaMatch[0];

  const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
  if (!contentMatch) return;

  return contentMatch[1].trim();
};
