export interface EmbedInput {
  title: string;
  description: string;
  url: string;
  colour: string;
  authorName: string;
  authorUrl: string;
  authorIcon: string;
  thumbnail: string;
  image: string;
  footerText: string;
  footerIcon: string;
  timestamp: boolean;
  fields: string;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function call(target: string, pairs: [string, string][]): string | null {
  const given = pairs.filter(([, value]) => value.trim());
  if (!given.length) return null;
  return `${target}(${given.map(([key, value]) => `${key}=${quote(value.trim())}`).join(", ")})`;
}

function parseFields(
  raw: string,
): { name: string; value: string; inline: boolean }[] {
  return raw
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .map((parts) => ({
      name: parts[0],
      value: parts[1],
      inline: (parts[2] ?? "").toLowerCase() !== "false",
    }));
}

export function buildEmbedCode(input: EmbedInput): string {
  const constructor: string[] = [];
  if (input.title.trim())
    constructor.push(`    title=${quote(input.title.trim())},`);
  if (input.description.trim())
    constructor.push(`    description=${quote(input.description.trim())},`);
  if (input.url.trim()) constructor.push(`    url=${quote(input.url.trim())},`);
  if (input.colour)
    constructor.push(`    colour=discord.Colour.${input.colour}(),`);
  if (input.timestamp)
    constructor.push("    timestamp=discord.utils.utcnow(),");

  const lines = constructor.length
    ? ["embed = discord.Embed(", ...constructor, ")"]
    : ["embed = discord.Embed()"];

  const author = call("embed.set_author", [
    ["name", input.authorName],
    ["url", input.authorUrl],
    ["icon_url", input.authorIcon],
  ]);
  if (author) lines.push(author);

  const thumbnail = call("embed.set_thumbnail", [["url", input.thumbnail]]);
  if (thumbnail) lines.push(thumbnail);

  const image = call("embed.set_image", [["url", input.image]]);
  if (image) lines.push(image);

  for (const field of parseFields(input.fields)) {
    lines.push(
      `embed.add_field(name=${quote(field.name)}, value=${quote(field.value)}, inline=${field.inline ? "True" : "False"})`,
    );
  }

  const footer = call("embed.set_footer", [
    ["text", input.footerText],
    ["icon_url", input.footerIcon],
  ]);
  if (footer) lines.push(footer);

  return lines.join("\n");
}
