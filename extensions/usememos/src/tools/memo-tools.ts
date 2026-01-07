import { ToolDefinition } from "../api/openai";
import { getUsememosClient, Memo } from "../api/usememos";

export const memoTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_memos",
      description:
        "Search through the user's memos by content. Returns memos matching the search query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant memos",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_memos",
      description:
        "List the most recent memos. Use this to show the user their latest notes.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of memos to return (default: 10)",
          },
          include_archived: {
            type: "boolean",
            description: "Whether to include archived memos (default: false)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_memo",
      description: "Get the full content of a specific memo by its ID.",
      parameters: {
        type: "object",
        properties: {
          memo_id: {
            type: "string",
            description: "The memo ID (e.g., 'memos/123' or just '123')",
          },
        },
        required: ["memo_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memo",
      description: "Create a new memo with the given content.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content of the memo (supports Markdown)",
          },
          visibility: {
            type: "string",
            enum: ["PRIVATE", "WORKSPACE", "PUBLIC"],
            description: "Visibility of the memo (default: PRIVATE)",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memo",
      description: "Update the content of an existing memo.",
      parameters: {
        type: "object",
        properties: {
          memo_id: {
            type: "string",
            description: "The memo ID to update",
          },
          content: {
            type: "string",
            description: "The new content for the memo",
          },
        },
        required: ["memo_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "organize_memos",
      description:
        "Analyze memos and suggest organization improvements like tags, grouping, or cleanup.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["suggest_tags", "find_duplicates", "summarize"],
            description: "The type of organization to perform",
          },
        },
        required: ["action"],
      },
    },
  },
];

function formatMemoForAI(memo: Memo): string {
  return `[${memo.name}] (${new Date(memo.updateTime).toLocaleDateString()})${memo.pinned ? " 📌" : ""}
${memo.content.slice(0, 500)}${memo.content.length > 500 ? "..." : ""}`;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = getUsememosClient();

  try {
    switch (name) {
      case "search_memos": {
        const query = args.query as string;
        const memos = await client.searchMemos(query);
        if (memos.length === 0) {
          return `No memos found matching "${query}".`;
        }
        return `Found ${memos.length} memo(s):\n\n${memos.map(formatMemoForAI).join("\n\n---\n\n")}`;
      }

      case "list_recent_memos": {
        const limit = (args.limit as number) || 10;
        const includeArchived = args.include_archived as boolean;
        const filter = includeArchived ? "" : 'row_status == "NORMAL"';
        const result = await client.listMemos({ filter, pageSize: limit });
        if (!result.memos || result.memos.length === 0) {
          return "No memos found.";
        }
        return `Recent memos:\n\n${result.memos.map(formatMemoForAI).join("\n\n---\n\n")}`;
      }

      case "get_memo": {
        let memoId = args.memo_id as string;
        if (!memoId.startsWith("memos/")) {
          memoId = `memos/${memoId}`;
        }
        const memo = await client.getMemo(memoId);
        return `Memo: ${memo.name}
Created: ${new Date(memo.createTime).toLocaleString()}
Updated: ${new Date(memo.updateTime).toLocaleString()}
Visibility: ${memo.visibility}
Pinned: ${memo.pinned}
Tags: ${memo.tags?.join(", ") || "none"}

Content:
${memo.content}`;
      }

      case "create_memo": {
        const content = args.content as string;
        const visibility =
          (args.visibility as "PRIVATE" | "WORKSPACE" | "PUBLIC") || "PRIVATE";
        const memo = await client.createMemo({ content, visibility });
        return `✅ Memo created successfully!
ID: ${memo.name}
Visibility: ${memo.visibility}

Content preview:
${memo.content.slice(0, 200)}${memo.content.length > 200 ? "..." : ""}`;
      }

      case "update_memo": {
        let memoId = args.memo_id as string;
        if (!memoId.startsWith("memos/")) {
          memoId = `memos/${memoId}`;
        }
        const content = args.content as string;
        const memo = await client.updateMemo(memoId, { content }, ["content"]);
        return `✅ Memo updated successfully!
ID: ${memo.name}

New content preview:
${memo.content.slice(0, 200)}${memo.content.length > 200 ? "..." : ""}`;
      }

      case "organize_memos": {
        const action = args.action as string;
        const result = await client.listMemos({ pageSize: 50 });
        const memos = result.memos || [];

        switch (action) {
          case "suggest_tags": {
            const untagged = memos.filter(
              (m) => !m.tags || m.tags.length === 0,
            );
            return untagged.length === 0
              ? "All memos have tags! 🎉"
              : `Found ${untagged.length} memo(s) without tags:\n\n${untagged.map((m) => `- ${m.name}: "${m.content.slice(0, 50)}..."`).join("\n")}`;
          }
          case "find_duplicates": {
            const contentMap = new Map<string, Memo[]>();
            memos.forEach((m) => {
              const key = m.content.slice(0, 100).toLowerCase();
              const existing = contentMap.get(key) || [];
              existing.push(m);
              contentMap.set(key, existing);
            });
            const duplicates = Array.from(contentMap.values()).filter(
              (arr) => arr.length > 1,
            );
            return duplicates.length === 0
              ? "No duplicate memos found! 🎉"
              : `Found ${duplicates.length} potential duplicate group(s):\n\n${duplicates.map((group) => group.map((m) => `- ${m.name}`).join("\n")).join("\n\n")}`;
          }
          case "summarize": {
            const total = memos.length;
            const pinned = memos.filter((m) => m.pinned).length;
            const tagged = memos.filter(
              (m) => m.tags && m.tags.length > 0,
            ).length;
            return `📊 Memo Summary:
- Total memos: ${total}
- Pinned: ${pinned}
- With tags: ${tagged}
- Without tags: ${total - tagged}`;
          }
          default:
            return `Unknown action: ${action}`;
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error executing ${name}: ${String(error)}`;
  }
}
