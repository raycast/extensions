/**
 * Converts Atlassian Document Format (ADF) / ProseMirror JSON
 * into Raycast-compatible markdown. Falls back to raw string
 * if the input isn't valid ADF JSON.
 */

interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export function descriptionToMarkdown(raw: string): string {
  if (!raw.trim()) return "";

  let doc: AdfNode;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type !== "doc" || !Array.isArray(parsed.content)) {
      return raw;
    }
    doc = parsed as AdfNode;
  } catch {
    return raw;
  }

  return renderNodes(doc.content ?? []).trim();
}

function renderNodes(nodes: AdfNode[], listDepth = 0): string {
  let out = "";
  for (const node of nodes) {
    out += renderNode(node, listDepth);
  }
  return out;
}

function renderNode(node: AdfNode, listDepth: number): string {
  switch (node.type) {
    case "paragraph":
      return renderInline(node.content) + "\n\n";

    case "heading": {
      const level = Math.min((node.attrs?.level as number) ?? 1, 6);
      const prefix = "#".repeat(level);
      return `${prefix} ${renderInline(node.content)}\n\n`;
    }

    case "bulletList":
      return (node.content ?? []).map((li) => renderListItem(li, "- ", listDepth)).join("") + "\n";

    case "orderedList":
      return (node.content ?? []).map((li, i) => renderListItem(li, `${i + 1}. `, listDepth)).join("") + "\n";

    case "listItem": {
      return renderNodes(node.content ?? [], listDepth);
    }

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = renderInline(node.content, true);
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }

    case "blockquote": {
      const inner = renderNodes(node.content ?? [], listDepth);
      return (
        inner
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n") + "\n\n"
      );
    }

    case "rule":
      return "---\n\n";

    case "hardBreak":
      return "\n";

    case "text":
      return applyMarks(node.text ?? "", node.marks);

    case "mention": {
      const name = (node.attrs?.text as string) ?? (node.attrs?.id as string) ?? "someone";
      return `@${name.replace(/^@/, "")}`;
    }

    case "inlineCard": {
      const url = node.attrs?.url as string;
      return url ? `[link](${url})` : "";
    }

    case "mediaGroup":
    case "mediaSingle":
    case "media":
      return "*(attachment)*\n\n";

    case "table":
      return renderTable(node);

    case "emoji": {
      const shortName = (node.attrs?.shortName as string) ?? "";
      const fallback = (node.attrs?.text as string) ?? shortName;
      return fallback || ":emoji:";
    }

    case "panel": {
      const panelType = (node.attrs?.panelType as string) ?? "info";
      const icon = panelType === "warning" ? "⚠️" : panelType === "error" ? "🚨" : "ℹ️";
      return `${icon} ${renderNodes(node.content ?? [], listDepth)}\n`;
    }

    default:
      if (node.content) {
        return renderNodes(node.content, listDepth);
      }
      return "";
  }
}

function renderListItem(node: AdfNode, prefix: string, depth: number): string {
  const indent = "  ".repeat(depth);
  const inner = renderNodes(node.content ?? [], depth + 1).trimEnd();
  const lines = inner.split("\n");
  const first = `${indent}${prefix}${lines[0] ?? ""}`;
  const rest = lines
    .slice(1)
    .map((l) => `${indent}  ${l}`)
    .join("\n");
  return rest ? `${first}\n${rest}\n` : `${first}\n`;
}

function renderInline(nodes?: AdfNode[], raw = false): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "text") {
        return raw ? (n.text ?? "") : applyMarks(n.text ?? "", n.marks);
      }
      if (n.type === "hardBreak") return "\n";
      if (n.type === "mention") {
        const name = (n.attrs?.text as string) ?? (n.attrs?.id as string) ?? "someone";
        return `@${name.replace(/^@/, "")}`;
      }
      if (n.type === "emoji") {
        return (n.attrs?.text as string) ?? (n.attrs?.shortName as string) ?? "";
      }
      if (n.type === "inlineCard") {
        const url = n.attrs?.url as string;
        return url ? `[link](${url})` : "";
      }
      return renderNode(n, 0);
    })
    .join("");
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return text;
  let out = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        out = `**${out}**`;
        break;
      case "em":
        out = `*${out}*`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "link": {
        const href = mark.attrs?.href as string;
        if (href) out = `[${out}](${href})`;
        break;
      }
    }
  }
  return out;
}

function renderTable(node: AdfNode): string {
  const rows = node.content ?? [];
  if (rows.length === 0) return "";

  const matrix: string[][] = [];
  for (const row of rows) {
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      cells.push(
        renderNodes(cell.content ?? [])
          .trim()
          .replace(/\n/g, " "),
      );
    }
    matrix.push(cells);
  }

  if (matrix.length === 0) return "";
  const colCount = Math.max(...matrix.map((r) => r.length));

  const lines: string[] = [];
  const header = matrix[0] ?? [];
  lines.push("| " + Array.from({ length: colCount }, (_, i) => header[i] ?? "").join(" | ") + " |");
  lines.push("| " + Array.from({ length: colCount }, () => "---").join(" | ") + " |");

  for (const row of matrix.slice(1)) {
    lines.push("| " + Array.from({ length: colCount }, (_, i) => row[i] ?? "").join(" | ") + " |");
  }

  return lines.join("\n") + "\n\n";
}
