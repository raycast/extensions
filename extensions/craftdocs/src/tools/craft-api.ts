import { getPreferenceValues, Tool } from "@raycast/api";
import { buildCraftApiUrl } from "../lib/aiTools";

type Input = {
  /** HTTP method. */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Endpoint path starting with "/", e.g. "/blocks" or "/documents/search". */
  path: string;
  /** Optional query string without "?", e.g. "id=abc123&maxDepth=1" or "date=today". */
  query?: string;
  /** Optional JSON request body as a string. */
  body?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.method === "GET") {
    return undefined;
  }

  return {
    message: `${input.method} ${input.path} in Craft?`,
    info: [
      { name: "Query", value: input.query },
      { name: "Body", value: input.body },
    ],
  };
};

/**
 * Call the Craft API (same API the Craft MCP uses). Document ID = root block ID. Markdown supports Craft extensions.
 *
 * Blocks:
 * - GET /blocks?id=<blockId>|date=today|YYYY-MM-DD [&maxDepth=-1] → block tree with IDs and markdown
 * - POST /blocks {"blocks":[{"type":"text","markdown":"..."}],"position":{"pageId":"<id>","position":"start|end"}}
 *   (position may also be {"siblingId":"<id>","position":"before|after"} or {"date":"today","position":"end"})
 * - PUT /blocks {"blocks":[{"id":"<blockId>","markdown":"new content"}]} → edit blocks (only given fields change)
 * - DELETE /blocks {"blockIds":["<id>"]}
 * - PUT /blocks/move {"blockIds":["<id>"],"position":{...}}
 * - GET /blocks/search?blockId=<docId>&pattern=<RE2>
 * Documents:
 * - GET /documents [?location=unsorted|trash|templates|daily_notes&folderId=]
 * - GET /documents/search?include=<terms>
 * - POST /documents {"documents":[{"title":"..."}],"destination":{"destination":"unsorted"}|{"folderId":"<id>"}}
 * - DELETE /documents {"documentIds":[...]}, PUT /documents/move {"documentIds":[...],"destination":{...}}
 * Folders: GET /folders, POST /folders {"folders":[{"name":"...","parentFolderId":"<id>"}]}, DELETE /folders, PUT /folders/move
 * Tasks:
 * - GET /tasks?scope=active|upcoming|inbox|logbook|document|all[&documentId=]
 * - POST /tasks {"tasks":[{"title":"...","location":{"type":"inbox"|"dailyNote","date":"YYYY-MM-DD"|"document","documentId":"<id>"},"scheduledDate":"YYYY-MM-DD"}]}
 * - PUT /tasks {"tasksToUpdate":[{"id":"<id>","state":"done"}]}, DELETE /tasks {"idsToDelete":[...]}
 * Collections: GET /collections, GET|POST|PUT|DELETE /collections/<id>/items, GET|PUT /collections/<id>/schema
 * Comments: POST /comments {"comments":[{"blockId":"<id>","text":"..."}]}
 * Connection info: GET /connection
 */
export default async function (input: Input) {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();

  if (!apiUrl) {
    throw new Error("The Craft API is not configured. Add the Craft API URL in the extension preferences.");
  }

  const url = buildCraftApiUrl(apiUrl, input.path, input.query);

  const response = await fetch(url, {
    method: input.method,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: input.method === "GET" ? undefined : input.body,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Craft API ${response.status}: ${text}`);
  }

  return text;
}
