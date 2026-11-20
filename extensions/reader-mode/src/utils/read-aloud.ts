import { marked, type Token, type Tokens } from "marked";
import { decodeEntities } from "./markdown-source";

/** litomore's Say extension, launched through the raycast-cross-extension convention. */
export const SAY_EXTENSION = {
  owner: "litomore",
  name: "say",
  speakCommand: "typeToSay",
  stopCommand: "stopRunningSay",
} as const;

/**
 * What Say reads: the title as written, then the article's text, one block per paragraph, heading,
 * list item or table row. Read from the parsed Markdown rather than by stripping syntax, so a voice
 * never reads out a pipe, a tilde or a URL: code blocks and images are skipped, links read as their
 * text (a bare URL as "a link"), and table cells are joined with commas. Footnotes are skipped,
 * as a narrator would.
 */
export function readAloudText(title: string, bodyMarkdown: string): string {
  const blocks = speakBlocks(marked.lexer(dropFootnoteDefinitions(bodyMarkdown)));
  return [decodeEntities(title).trim(), ...blocks].filter(Boolean).join("\n\n");
}

const FOOTNOTE_DEFINITION = /^ {0,3}\[\^[^\]\s]+\]:/;
const INDENTED = /^(?: {4}|\t)/;

/**
 * Removes each footnote definition: its "[^id]:" line and the indented lines that continue it,
 * blank lines between them included. marked has no footnotes, so left in, a definition is lexed as
 * a link definition, a paragraph or an indented code block depending on its shape. The "[^id]"
 * references left in the text are dropped by speakText.
 */
function dropFootnoteDefinitions(markdown: string): string {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let inDefinition = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FOOTNOTE_DEFINITION.test(line)) {
      inDefinition = true;
      continue;
    }
    if (inDefinition) {
      if (INDENTED.test(line)) continue;
      if (!line.trim()) {
        let next = i + 1;
        while (next < lines.length && !lines[next].trim()) next++;
        if (next < lines.length && INDENTED.test(lines[next])) continue;
      }
      inDefinition = false;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function speakBlocks(tokens: Token[]): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "heading":
      case "paragraph":
        out.push(speakInline(token.tokens));
        break;
      case "text":
        out.push(token.tokens ? speakInline(token.tokens) : speakText(token.text));
        break;
      case "list":
        for (const item of (token as Tokens.List).items) out.push(...speakBlocks(item.tokens));
        break;
      case "blockquote":
        out.push(...speakBlocks(token.tokens ?? []));
        break;
      case "table": {
        const table = token as Tokens.Table;
        for (const row of [table.header, ...table.rows]) {
          out.push(row.map((cell) => speakInline(cell.tokens).trim()).join(", "));
        }
        break;
      }
      // code, hr, html, space, def: nothing to say.
    }
  }
  return out.map((block) => block.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
}

/**
 * Plain text as spoken. marked has no footnotes, so their "[^1]" references arrive as text; they
 * are dropped here, in text tokens only, so code and escaped brackets keep theirs.
 */
function speakText(text: string): string {
  return decodeEntities(text).replace(/\[\^[^\]\s]+\]:?/g, "");
}

function speakInline(tokens: Token[] | undefined): string {
  return (tokens ?? []).map(speakInlineToken).join("");
}

function speakInlineToken(token: Token): string {
  switch (token.type) {
    case "text":
      return token.tokens ? speakInline(token.tokens) : speakText(token.text);
    case "escape":
      return token.text;
    case "codespan":
      return decodeEntities(token.text);
    case "strong":
    case "em":
    case "del":
      return speakInline(token.tokens);
    case "link": {
      const text = speakInline(token.tokens).trim();
      return !text || /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.|mailto:)/i.test(text) ? "a link" : text;
    }
    case "br":
      return "\n";
    // image, html, checkbox: nothing to say.
    default:
      return "";
  }
}

/**
 * Whether `ps -axo command=` output shows Say speaking. Say exposes no status, so this matches
 * the two processes it speaks through, as its own Stop command does: the `say` binary for system
 * voices, and an osascript host running its `mac-speech.js --speak` for Siri voices.
 */
export function isSayRunning(psOutput: string): boolean {
  return psOutput.split("\n").some((line) => {
    const command = line.trim();
    return (
      /^(?:\/usr\/bin\/)?say(?:\s|$)/.test(command) ||
      /^\/usr\/bin\/osascript -l JavaScript .*\/mac-speech\.js --speak$/.test(command)
    );
  });
}
