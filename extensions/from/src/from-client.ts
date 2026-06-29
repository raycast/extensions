import { getPreferenceValues } from "@raycast/api";

export interface FromNode {
  id: string;
  text: string;
  body?: string | null;
  parentId?: string | null;
  // El servidor puede devolver types como array o como string JSON.
  types?: string[] | string | null;
  status?: string | null;
  due?: string | null;
  isEvent?: boolean;
}

/** Normaliza el campo types (array o string JSON) a un array de strings. */
export function nodeTypes(n: FromNode): string[] {
  const t = n.types;
  if (Array.isArray(t)) return t;
  if (typeof t === "string") {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

function base(): string {
  const b = (
    prefs().baseUrl || "https://from-server-production.up.railway.app"
  ).trim();
  return b.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${prefs().apiToken.trim()}`,
  };
}

// ── MCP (JSON-RPC) ──────────────────────────────────────────────────────────
let rpcId = 0;

async function mcpCall<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${base()}/mcp`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: String(++rpcId),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  if (!res.ok) {
    if (res.status === 401)
      throw new Error(
        "Invalid token. Check your API token in the extension preferences.",
      );
    throw new Error(`Server error (${res.status}).`);
  }
  const data = (await res.json()) as {
    error?: { message?: string };
    result?: { content?: { type: string; text?: string }[] };
  };
  if (data.error) throw new Error(data.error.message || "Error MCP");
  const text = data.result?.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Algunos tools devuelven texto plano (p.ej. solo el id).
    return text as unknown as T;
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

/** Devuelve el id de la nota diaria de hoy (la crea si no existe). */
export async function getTodayNoteId(): Promise<string> {
  const r = await mcpCall<string | { id?: string; nodeId?: string }>(
    "from_get_today_note",
    {},
  );
  if (typeof r === "string") return r.trim();
  return (r.id || r.nodeId || "").trim();
}

/** Busca nodos por texto (server-side full-text). */
export async function searchNodes(q: string, limit = 25): Promise<FromNode[]> {
  const res = await fetch(
    `${base()}/search/nodes?q=${encodeURIComponent(q)}&limit=${limit}`,
    {
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    if (res.status === 401)
      throw new Error(
        "Invalid token. Check your API token in the extension preferences.",
      );
    throw new Error(`Server error (${res.status}).`);
  }
  const data = (await res.json()) as { nodes?: FromNode[] };
  return data.nodes ?? [];
}

/** URL profunda para abrir un nodo en la app de From (Mac). */
export function nodeDeepLink(id: string): string {
  return `from://node/${id}`;
}

/** URL web de la app para abrir un nodo (fallback si no hay app Mac). */
export function nodeWebUrl(id: string): string {
  return `https://fromly.app/app/node/${id}`;
}
