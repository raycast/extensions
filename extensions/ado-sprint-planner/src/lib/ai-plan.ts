import { WorkItem } from "./types";

// Gemini free tier (Google AI Studio). gemini-3.1-flash-lite is what's
// available on this account's free tier (Pro left the free tier in Apr 2026,
// and newer Flash variants aren't provisioned here). Flash-Lite limits far
// exceed our occasional, one-call-per-re-plan use. If the account later gets a
// stronger free model (e.g. gemini-3.5-flash), bump this const.
const GEMINI_MODEL = "gemini-3.1-flash-lite";

function endpoint(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function buildPrompt(items: WorkItem[]): string {
  const list = items.map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    priority: i.priority ?? null,
    state: i.state,
    storyPoints: i.storyPoints ?? null,
  }));
  return [
    "You are sequencing a software developer's sprint work items into the ideal order to work them this sprint.",
    "Guidelines:",
    "- Finish in-progress work before starting anything new.",
    "- Respect priority (1 = highest).",
    "- Pull bugs earlier when they look blocking or risky.",
    "- Keep related items together (e.g. a user story near its tasks/bugs) so context isn't lost.",
    "- Keep a sustainable mix of stories, tasks, and bugs; don't starve any type.",
    "Return ONLY a JSON array of the item ids, each id exactly once, in the order they should be worked.",
    `Items: ${JSON.stringify(list)}`,
  ].join("\n");
}

/**
 * Ask Gemini to sequence the items. Returns ids restricted to the known set and
 * de-duplicated (the AI decides order only — the caller reconciles any missing
 * ids and feeds the result through the deterministic projectPlan). Throws on
 * network/HTTP/parse errors so the caller can fall back to the deterministic order.
 */
export async function aiOrderItems(
  items: WorkItem[],
  apiKey: string,
): Promise<number[]> {
  if (items.length === 0) return [];

  const res = await fetch(endpoint(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(items) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: { type: "ARRAY", items: { type: "INTEGER" } },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gemini ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini did not return a JSON array of ids");
  }

  // Keep only known ids, de-duplicated — never trust the model to invent work.
  const known = new Set(items.map((i) => i.id));
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const x of parsed) {
    const id = typeof x === "number" ? x : Number(x);
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
