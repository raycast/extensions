/**
 * Chat history as Raycast shows it: either literally, in a fenced block, or as
 * Markdown with anything that could load a remote address defused. History is
 * untrusted text, so both forms are safe to display.
 */

/**
 * Chat history is untrusted text, and Raycast renders Markdown, where an image
 * or link would load a remote address. Text is shown in a code block fenced
 * longer than any run of backticks inside it, so nothing in it is interpreted.
 */
export function literal(content: string, limit = 4000): string {
  const clipped = content.length > limit ? `${content.slice(0, limit)}…` : content;
  const longest = Math.max(2, ...Array.from(clipped.matchAll(/`+/g), (run) => run[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${clipped}\n${fence}`;
}

/**
 * Chat history rendered as Markdown, so code, lists and emphasis read as they
 * did in the chat. History is untrusted, and Raycast loads images, so every
 * image is turned into a link (links load nothing until clicked) and raw HTML
 * tags are shown as text. Code blocks and code spans are left alone: Raycast
 * shows them literally.
 */
export function rendered(content: string, limit = 4000): string {
  const clipped = content.length > limit ? `${content.slice(0, limit)}…` : content;
  let fence = "";
  return clipped
    .split("\n")
    .map((line) => {
      const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (opener && opener[0] === fence[0] && opener.length >= fence.length) fence = "";
        return line;
      }
      if (opener) {
        fence = opener;
        return line;
      }
      return outsideCode(line);
    })
    .join("\n");
}

/**
 * Defuses images and HTML in one line, outside its code spans. A run of
 * backticks opens a code span only when the same run closes it later on the
 * line; an unmatched run is ordinary text, so what follows it is defused too.
 */
function outsideCode(line: string): string {
  const parts = line.split(/(`+)/);
  const isRun = (part: string) => /^`+$/.test(part);
  let shown = "";
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!isRun(part)) {
      shown += part.replace(/!\[/g, "\\![").replace(/<(?=[a-zA-Z!/?])/g, "&lt;");
      continue;
    }
    const close = parts.indexOf(part, index + 1);
    if (close < 0) {
      shown += part;
      continue;
    }
    shown += parts.slice(index, close + 1).join("");
    index = close;
  }
  return shown;
}
