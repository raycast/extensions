import { getPrompts } from "../lib/storage";

export type Input = {
  /** Optional category filter. Case-insensitive match. */
  category?: string;
  /** Optional search query that matches title, description, or category. */
  query?: string;
  /** Limit number of items returned. Defaults to 50. */
  limit?: number;
};

/**
 * List saved Amp prompts with category and description.
 * Returns a Markdown-formatted list sorted by last updated.
 */
export default async function tool(input: Input = {}) {
  try {
    const { category, query, limit = 50 } = input;
    const all = await getPrompts();

    const filtered = all
      .filter((p) => {
        const byCategory = category
          ? p.category.toLowerCase() === category.toLowerCase()
          : true;
        const byQuery = query
          ? [p.title, p.description ?? "", p.category]
              .join("\n")
              .toLowerCase()
              .includes(query.toLowerCase())
          : true;
        return byCategory && byQuery;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, Math.max(0, Math.min(200, limit)));

    if (filtered.length === 0) {
      return "No prompts found.";
    }

    const lines: string[] = [
      "# Saved Prompts",
      "",
      "| Title | Category | Updated | Description |",
      "|---|---|---|---|",
      ...filtered.map(
        (p) =>
          `| ${escapePipes(p.title)} | ${escapePipes(p.category)} | ${p.updatedAt.toLocaleString()} | ${escapePipes(p.description ?? "")} |`,
      ),
      "",
      "Tip: Use run-prompt with `id` or exact `title` to paste a command.",
    ];

    return lines.join("\n");
  } catch (err) {
    return `Error listing prompts: ${String(err)}`;
  }
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|");
}
