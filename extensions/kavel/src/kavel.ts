// Minimal client for Kavel's image API. Without a key it uses the free
// anonymous tier, metered against a client id invented per call.

const BASE = "https://www.kavel.ai";

export class KavelError extends Error {}

function anonId(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return (
    "raycast-" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
  );
}

// Refusals answer HTTP 200 with code -1 and a human message.
async function call(
  path: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const env = (await res.json()) as {
    code: number;
    message?: string;
    data?: Record<string, unknown>;
  };
  if (env.code !== 0) throw new KavelError(env.message ?? "Request refused.");
  return env.data ?? {};
}

export async function generate(
  prompt: string,
  aspectRatio: string,
  apiKey: string | undefined,
  onStatus: (s: string) => void,
): Promise<string> {
  const auth: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : { "x-anon-id": anonId() };
  const d = await call("/api/ai/generate", auth, {
    provider: "kie",
    mediaType: "image",
    model: "kavel-image-v1",
    scene: "text-to-image",
    prompt,
    options: { aspect_ratio: aspectRatio },
  });
  // The quota wall answers 200 with code 0 and wall: true.
  if (d.wall) {
    throw new KavelError(
      d.reason === "anon_ip_daily"
        ? "The free allowance for this Mac is spent for today. Add an API key in the extension preferences."
        : "This needs a Kavel account. Add an API key in the extension preferences.",
    );
  }
  if (typeof d.id !== "string")
    throw new KavelError("Kavel returned no task id.");
  onStatus("Queued: free runs wait a little before they start…");
  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    let p: Record<string, unknown>;
    try {
      p = apiKey
        ? await call("/api/ai/query", auth, { taskId: d.id })
        : await call(
            `/api/ai/anon-query?taskId=${encodeURIComponent(d.id)}&provider=kie&mediaType=image`,
            auth,
          );
    } catch {
      continue; // a dropped poll is not a failed job
    }
    const clean = p.cleanImages as string[] | undefined;
    const images = p.images as string[] | undefined;
    if (clean?.length) return clean[0];
    if (images?.length) return images[0];
    if (p.status === "failed" || p.status === "error")
      throw new KavelError("The prompt was refused. Try rewording it.");
    onStatus("Generating…");
  }
  throw new KavelError("No image before the deadline.");
}
