import type { ChatMessage } from "./conversations";

function displayWidth(value: string) {
  return Array.from(value).reduce(
    (width, character) =>
      width + ((character.codePointAt(0) || 0) > 0xff ? 2 : 1),
    0,
  );
}

// Keep each monospace line short enough to remain visible,
// preferring word boundaries and keeping closing punctuation on its line.
function wrapLine(value: string, limit: number, code: boolean) {
  const rows: string[] = [];
  let remaining = value;
  const indentation = code ? value.match(/^ */)?.[0] || "" : "";
  while (displayWidth(remaining) > limit) {
    const characters = Array.from(remaining);
    let width = 0;
    let end = 0;
    let wordEnd = 0;
    while (end < characters.length) {
      const character = characters[end];
      const nextWidth = width + displayWidth(character);
      if (
        end > 0 &&
        nextWidth > limit &&
        !/[，。！？；：、,.!?;:）)\]】》]/.test(character)
      )
        break;
      width = nextWidth;
      end += 1;
      if (/\s/.test(character) && width > limit / 2) wordEnd = end;
    }
    const split = !code && wordEnd ? wordEnd : end;
    rows.push(characters.slice(0, split).join("").trimEnd());
    const next = characters.slice(split).join("");
    // Do not duplicate indentation wider than the row itself.
    remaining =
      code && indentation.length < limit / 2
        ? indentation + next
        : code
          ? next
          : next.trimStart();
  }
  if (remaining.trim()) rows.push(remaining.trimEnd());
  return rows;
}

export function messageRows(content: string, limit = 78): string[] {
  const rows: string[] = [];
  let fence: string | null = null;
  for (const source of content.replace(/\r\n?/g, "\n").split("\n")) {
    const marker = source.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence && marker) {
      fence = marker[1];
      continue;
    }
    if (
      fence &&
      marker &&
      marker[1][0] === fence[0] &&
      marker[1].length >= fence.length &&
      !marker[2].trim()
    ) {
      fence = null;
      continue;
    }
    const line = fence
      ? source.replace(/\t/g, "    ")
      : source
          .trim()
          .replace(/^#{1,6}\s+/, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/`([^`]+)`/g, "$1");
    if (line.trim()) rows.push(...wrapLine(line, limit, Boolean(fence)));
  }
  return rows.length ? rows : ["正在思考…"];
}

export function conversationMarkdown(
  messages: ChatMessage[],
  assetsPath: string,
  status: string,
  error: string,
) {
  const cards = [...messages].reverse().map((message) => {
    const speaker =
      message.role === "assistant"
        ? "ChatGPT"
        : message.kind === "steer"
          ? "你 · 补充要求"
          : "你";
    const avatar =
      message.role === "assistant" ? "command-icon.png" : "user-avatar.svg";
    const body = messageRows(message.content, 86).join("\n");
    // Longer fences keep literal backticks inside a reply from ending its card.
    const runs = body.match(/`+/g) || [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    return `![${speaker}](${encodeURI(assetsPath)}/${avatar}?raycast-width=22&raycast-height=22) **${speaker}**\n\n${fence}text\n${body}\n${fence}`;
  });
  const notice = error ? `连接提示：${error}` : status;
  const header = notice ? `> ${notice.replace(/\r?\n/g, " ")}\n\n` : "";
  return (
    header +
    (cards.join("\n\n") ||
      "## 开始新对话\n\n按 Enter 输入问题，发送后会回到这里显示回复。")
  );
}

export function rowTitle(row: string) {
  return row.replace(/^ +/, (spaces) => "\u00a0".repeat(spaces.length));
}
