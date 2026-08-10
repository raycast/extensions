import type { ZaiUsage, ZaiError } from "./types.ts";
import { parseZaiApiResponse } from "./parser.ts";
import { httpFetch } from "../agents/http.ts";

export const ZAI_OPENCODE_KEY = "zai-coding-plan";

const ZAI_USAGE_API = "https://api.z.ai/api/monitor/usage/quota/limit";

export async function fetchZaiUsage(token: string): Promise<{ usage: ZaiUsage | null; error: ZaiError | null }> {
  const { data, error } = await httpFetch({ url: ZAI_USAGE_API, token, headers: { Accept: "application/json" } });
  if (error) return { usage: null, error };
  return parseZaiApiResponse(data);
}
