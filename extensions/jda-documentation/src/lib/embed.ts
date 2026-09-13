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
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n?/g, "\\n")
    .replace(/\n/g, "\\n")}"`;
}

// Java arguments are positional, so a blank value between two filled ones has
// to become an explicit null rather than disappear and shift the rest along.
function call(method: string, values: string[]): string | null {
  const trimmed = values.map((value) => value.trim());
  const last = trimmed.reduce(
    (found, value, index) => (value ? index : found),
    -1,
  );
  if (last === -1) return null;

  const args = trimmed
    .slice(0, last + 1)
    .map((value) => (value ? quote(value) : "null"));
  return `        .${method}(${args.join(", ")})`;
}

// Only the name and the trailing inline flag are delimited; splitting the whole
// line would swallow every pipe a Discord table or markdown value contains.
function parseField(
  line: string,
): { name: string; value: string; inline: boolean } | null {
  const separator = line.indexOf("|");
  if (separator === -1) return null;

  const name = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  let inline = true;

  const trailing = value.lastIndexOf("|");
  if (trailing !== -1) {
    const flag = value
      .slice(trailing + 1)
      .trim()
      .toLowerCase();
    if (flag === "true" || flag === "false") {
      inline = flag === "true";
      value = value.slice(0, trailing).trim();
    }
  }

  return name && value ? { name, value, inline } : null;
}

function parseFields(
  raw: string,
): { name: string; value: string; inline: boolean }[] {
  return raw
    .split("\n")
    .map(parseField)
    .filter(
      (field): field is { name: string; value: string; inline: boolean } =>
        field !== null,
    );
}

export function buildEmbedCode(input: EmbedInput): string {
  const lines = ["MessageEmbed embed = new EmbedBuilder()"];

  const title = call("setTitle", [input.title, input.url]);
  if (title) lines.push(title);

  const description = call("setDescription", [input.description]);
  if (description) lines.push(description);

  if (input.colour) lines.push(`        .setColor(${input.colour})`);

  const author = call("setAuthor", [
    input.authorName,
    input.authorUrl,
    input.authorIcon,
  ]);
  if (author) lines.push(author);

  const thumbnail = call("setThumbnail", [input.thumbnail]);
  if (thumbnail) lines.push(thumbnail);

  const image = call("setImage", [input.image]);
  if (image) lines.push(image);

  for (const field of parseFields(input.fields)) {
    lines.push(
      `        .addField(${quote(field.name)}, ${quote(field.value)}, ${field.inline})`,
    );
  }

  const footer = call("setFooter", [input.footerText, input.footerIcon]);
  if (footer) lines.push(footer);

  if (input.timestamp) lines.push("        .setTimestamp(Instant.now())");

  lines.push("        .build();");
  return lines.join("\n");
}
