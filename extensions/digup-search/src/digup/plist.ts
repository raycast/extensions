export type PlistValue = string | number | boolean | PlistValue[] | { [key: string]: PlistValue };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITIES[entity];
  });
}

interface Tag {
  name: string;
  closing: boolean;
  selfClosing: boolean;
}

function tagOf(token: string): Tag | null {
  const match = /^<(\/?)([A-Za-z]+)[^>]*?(\/?)>$/.exec(token);
  return match ? { name: match[2], closing: match[1] === "/", selfClosing: match[3] === "/" } : null;
}

/**
 * Reads the XML property list `defaults export <domain> -` prints. Dates and data come back as their text.
 * Undefined when the text isn't a whole property list.
 */
export function parsePlist(xml: string): PlistValue | undefined {
  const tokens = xml.match(/<[^>]*>|[^<]+/g) ?? [];
  let index = 0;

  // The next element tag: text between elements, the XML declaration and the doctype are passed over.
  function nextTag(): Tag | null {
    while (index < tokens.length) {
      const tag = tagOf(tokens[index++]);
      if (tag) return tag;
    }
    return null;
  }

  // The text of a leaf element, up to its closing tag.
  function textUntil(name: string): string {
    let value = "";
    while (index < tokens.length) {
      const token = tokens[index++];
      const tag = tagOf(token);
      if (tag?.closing && tag.name === name) break;
      if (!tag) value += token;
    }
    return decode(value);
  }

  function value(tag: Tag): PlistValue | undefined {
    if (tag.closing) return undefined;
    switch (tag.name) {
      case "true":
        return true;
      case "false":
        return false;
      case "string":
      case "date":
      case "data":
        return tag.selfClosing ? "" : textUntil(tag.name);
      case "integer":
      case "real":
        return tag.selfClosing ? 0 : Number(textUntil(tag.name));
      case "array": {
        const items: PlistValue[] = [];
        if (tag.selfClosing) return items;
        for (let next = nextTag(); next; next = nextTag()) {
          if (next.closing && next.name === "array") return items;
          const item = value(next);
          if (item === undefined) return undefined;
          items.push(item);
        }
        return undefined;
      }
      case "dict": {
        const entries: { [key: string]: PlistValue } = {};
        if (tag.selfClosing) return entries;
        for (let next = nextTag(); next; next = nextTag()) {
          if (next.closing && next.name === "dict") return entries;
          if (next.closing || next.name !== "key") return undefined;
          const key = next.selfClosing ? "" : textUntil("key");
          const valueTag = nextTag();
          const item = valueTag ? value(valueTag) : undefined;
          if (item === undefined) return undefined;
          entries[key] = item;
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }

  for (let tag = nextTag(); tag; tag = nextTag()) {
    if (tag.name === "plist") continue;
    return value(tag);
  }
  return undefined;
}
