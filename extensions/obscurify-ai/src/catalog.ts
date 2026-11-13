import { z } from "zod";

export const BASE_URL = "https://obscurify.ai/v1";

const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      context_length: z.number().nonnegative().nullish(),
      tools: z.boolean().optional(),
      decisions: z.boolean().optional(),
      pricing: z
        .object({
          prompt: z.number().nullish(),
          completion: z.number().nullish(),
        })
        .partial()
        .optional(),
    }),
  ),
});

export type CatalogModel = z.infer<typeof catalogSchema>["data"][number];

export async function fetchCatalog(apiKey: string | undefined, fetcher: typeof fetch = fetch): Promise<CatalogModel[]> {
  const response = await fetcher(`${BASE_URL}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Obscurify.ai rejected the API key. Check it in the extension preferences.");
    }
    throw new Error(`Could not fetch Obscurify.ai models (HTTP ${response.status}). Try Refresh Models again.`);
  }
  // Decision models answer structured questions only, so they are left out of chat pickers.
  return catalogSchema.parse(await response.json()).data.filter((model) => !model.decisions);
}

/** "DeepSeek: DeepSeek V4 Flash" -> "DeepSeek V4 Flash" */
export function displayName(model: CatalogModel): string {
  const name = model.name?.trim();
  if (!name) return model.id;
  const colon = name.indexOf(": ");
  return colon > 0 ? name.slice(colon + 2) : name;
}

/** Price per million tokens, e.g. "$0.12 / $0.24 per 1M" */
export function formatPrice(model: CatalogModel): string | undefined {
  const input = model.pricing?.prompt;
  const output = model.pricing?.completion;
  if (input == null || output == null) return undefined;
  const fmt = (perToken: number) => {
    const perMillion = perToken * 1_000_000;
    return `$${perMillion < 1 ? perMillion.toFixed(3) : perMillion.toFixed(2)}`;
  };
  return `${fmt(input)} in / ${fmt(output)} out per 1M tokens`;
}
