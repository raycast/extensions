import { readFile } from "fs/promises";

/**
 * Minimal Valve VDF (KeyValue) parser for Steam files (libraryfolders.vdf, appmanifest_*.acf, loginusers.vdf)
 * - Supports quoted keys/values
 * - Supports nested objects with { }
 * - Ignores comments and blank lines
 */
export type VDFValue = string | VDFObject;
export type VDFObject = { [key: string]: VDFValue };

export function parseVDF(content: string): VDFObject {
  const text = content.replace(/\r\n?/g, "\n");
  let i = 0;

  function skipWhitespace() {
    while (i < text.length) {
      const ch = text[i];
      if (ch === "/" && i + 1 < text.length && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
      } else if (ch === "\n" || ch === "\t" || ch === " " || ch === "\r") {
        i++;
      } else {
        break;
      }
    }
  }

  function readQuoted(): string {
    skipWhitespace();
    if (text[i] !== '"') throw new Error(`Expected '"' at position ${i}`);
    i++; // skip opening quote
    let result = "";
    while (i < text.length) {
      const ch = text[i++];
      if (ch === '"') break;
      if (ch === "\\") {
        if (i >= text.length) throw new Error(`Unexpected end of input after escape character at position ${i - 1}`);
        const next = text[i++];
        if (next === "n") result += "\n";
        else if (next === "t") result += "\t";
        else result += next;
      } else {
        result += ch;
      }
    }
    return result;
  }

  function readObject(): VDFObject {
    const obj: VDFObject = {};
    skipWhitespace();
    if (text[i] !== "{") throw new Error(`Expected '{' at position ${i}`);
    i++; // skip '{'
    while (i < text.length) {
      skipWhitespace();
      if (text[i] === "}") {
        i++; // skip '}'
        break;
      }
      const key = readQuoted();
      skipWhitespace();
      if (text[i] === "{") {
        const value = readObject();
        obj[key] = value;
      } else {
        const value = readQuoted();
        obj[key] = value;
      }
    }
    return obj;
  }

  function readTop(): VDFObject {
    const root: VDFObject = {};
    while (i < text.length) {
      skipWhitespace();
      if (i >= text.length) break;
      const key = readQuoted();
      skipWhitespace();
      if (text[i] === "{") {
        const value = readObject();
        root[key] = value;
      } else {
        const value = readQuoted();
        root[key] = value;
      }
    }
    return root;
  }

  return readTop();
}

export async function parseVDFFile(path: string): Promise<VDFObject> {
  const content = await readFile(path, "utf8");
  return parseVDF(content);
}
