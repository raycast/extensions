import { decodeHTML } from "entities";
import { marked, type MarkedToken, type Token } from "marked";

function domain(value: string) {
  if (!/^(?:(?:https?|ftp):\/\/|www\.)/i.test(value) || /\s/.test(value))
    return;
  try {
    const url = new URL(/^www\./i.test(value) ? "https://" + value : value);
    if (["http:", "https:", "ftp:"].includes(url.protocol))
      return url.hostname.replace(/^www\./i, "");
  } catch {
    // plain text and local paths do not need a url scheme.
  }
}

const rooted = /^(?:\/(?=[^\s])|~\/|\.{1,2}\/|[A-Za-z]:[\\/]|\\\\)/;
function spokenPath(value: string) {
  if (/^file:\/\//i.test(value)) {
    try {
      value = decodeURIComponent(new URL(value).pathname);
    } catch {
      /* keep the original filename */
    }
  }
  const name = value.split(/[\\/]/).filter(Boolean).pop();
  return name ? "path " + name : "root path";
}

// only confidently recognizable paths are shortened. prose like either/or and
// quantities like 3/4 should keep their ordinary pronunciation.
const pathStart = rooted.source.slice(1);
const hostPath =
  /(?:[\w-]+\.)+(?:com|org|net|edu|gov|io|dev|app|co|ai)\/[^\s<>"']*/;
const alternatives = [
  String.raw`"(?<doubleQuoted>${pathStart}[^"\n]*)"`,
  String.raw`'(?<singleQuoted>${pathStart}[^'\n]*)'`,
  String.raw`<(?<angled>${pathStart}[^<>\n]+)>`,
  /(?:https?:\/\/|file:\/\/|www\.)[^\s<>"']+/.source,
  `(?<bareHost>${hostPath.source})`,
  String.raw`${pathStart}[^\s<>"']+`,
  /(?:src|docs|bin|lib|assets|dist|tests?)\/[\w.-]+(?![\w/])/.source,
  /(?:[\p{L}_.-][\w.-]*\/)+(?:[\w.-]+\.[\w-]+|[\w.-]+\/[\w.-]+)(?![\w/])/u
    .source,
];
const reference = new RegExp(
  String.raw`(?<![\w/])(?:${alternatives.join("|")})`,
  "giu",
);

function references(text: string) {
  return text
    .replace(
      /\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]/g,
      (_, target: string, alias?: string) =>
        alias ?? target.split("/").pop() ?? target,
    )
    .replace(
      reference,
      (match, doubleQuoted, singleQuoted, angled, bareHost) => {
        const enclosed = doubleQuoted ?? singleQuoted ?? angled;
        if (enclosed) return spokenPath(enclosed);
        const token = match.replace(/[.,;:!?\])}]+$/, "");
        const host = domain(bareHost ? "https://" + token : token);
        return (host ?? spokenPath(token)) + match.slice(token.length);
      },
    );
}

function render(tokens: Token[]): string {
  return tokens
    .map((raw) => {
      // the lexer below uses only marked's built-in token types.
      const token = raw as MarkedToken;
      switch (token.type) {
        case "link":
        case "image": {
          const label = render(token.tokens).trim();
          if (label) {
            if (
              rooted.test(token.href) &&
              spokenPath(token.href) === "path " + label
            )
              return "path " + label;
            return domain(label) ?? label;
          }
          return (
            domain(token.href) ?? (token.href ? spokenPath(token.href) : "")
          );
        }
        case "heading":
        case "paragraph":
        case "blockquote":
        case "list_item":
          return render(token.tokens) + "\n";
        case "list":
          return (
            token.items.map((item) => render(item.tokens)).join("\n") + "\n"
          );
        case "strong":
        case "em":
        case "del":
          return render(token.tokens);
        case "table":
          return (
            [token.header, ...token.rows]
              .map((row) => row.map((cell) => render(cell.tokens)).join(", "))
              .join("\n") + "\n"
          );
        case "text":
          return token.tokens ? render(token.tokens) : decodeHTML(token.text);
        case "escape":
          return token.text;
        case "codespan":
          if (
            rooted.test(token.text) &&
            !/\s(?:[-|;&]|[~.]?\/)/.test(token.text)
          )
            return spokenPath(token.text);
          return token.text;
        case "code":
          return token.text + "\n";
        case "html":
          return decodeHTML(
            token.text
              .replace(/<!--[\s\S]*?-->/g, "")
              .replace(/<\/?[a-z][^>]*>/gi, ""),
          );
        case "hr":
        case "br":
        case "space":
          return "\n";
        case "def":
        case "checkbox":
          return "";
      }
    })
    .join("");
}

export function spokenText(input: string): string {
  return references(render(marked.lexer(input)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
