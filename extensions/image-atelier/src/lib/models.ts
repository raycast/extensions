import { endpoint } from "./images";

export type Model = { id: string; source: "declared" | "inferred" | "unknown" };
type ModelEntry = {
  id?: unknown;
  architecture?: { output_modalities?: unknown };
  output_modalities?: unknown;
};
export function parseModels(payload: unknown): Model[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data))
    throw new Error(
      "The provider did not return a model list. Enter a model ID manually.",
    );
  const models = new Map<string, Model>();
  for (const entry of data as ModelEntry[]) {
    if (!entry || typeof entry.id !== "string" || !entry.id.trim()) continue;
    const modalities =
      entry.architecture?.output_modalities ?? entry.output_modalities;
    const declared = Array.isArray(modalities);
    const source = declared
      ? modalities.includes("image")
        ? "declared"
        : "unknown"
      : /gpt-image|dall-e|\bflux\b|stable-diffusion|imagen|imagegen|text-to-image|nano-banana/i.test(
            entry.id,
          )
        ? "inferred"
        : "unknown";
    models.set(entry.id, { id: entry.id, source });
  }
  return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export async function discoverModels(
  baseUrl: string,
  apiKey: string,
): Promise<Model[]> {
  const url = endpoint(baseUrl, false).replace(
    /\/images\/generations$/,
    "/models",
  );
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(
      "Could not fetch models. Check your connection or enter a model ID manually.",
    );
  }
  if (!response.ok)
    throw new Error(
      `Model discovery returned HTTP ${response.status}. Check the API settings or enter a model ID manually.`,
    );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "The models endpoint returned non-JSON content. Enter a model ID manually.",
    );
  }
  return parseModels(payload);
}
