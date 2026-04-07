import { AI, environment } from "@raycast/api";
import { rules } from "./rules";
import { TRACKING_PARAMS } from "./tracking-params";
import { findURLs, replaceURLs } from "./url-utils";

export interface ParamInfo {
  name: string;
  value: string;
  keep: boolean;
}

export interface URLAnalysis {
  original: string;
  base: string;
  params: ParamInfo[];
  usedAI: boolean;
}

async function getAIAllowParams(url: string): Promise<string[] | null> {
  if (!environment.canAccess(AI)) return null;

  try {
    const urlObj = new URL(url);
    const params = Array.from(urlObj.searchParams.keys());
    if (params.length === 0) return null;

    const prompt = `You are a URL tracking parameter analyzer. Given a URL, identify which query parameters are essential for the page to function correctly (e.g., IDs, search queries, page numbers) and which are tracking/analytics parameters (e.g., utm_*, fbclid, gclid, referral codes).

URL: ${url}

Query parameters: ${params.join(", ")}

Reply with ONLY a JSON array of parameter names that should be KEPT (essential ones). If all parameters are tracking parameters, reply with []. Do not include any explanation.`;

    const response = await AI.ask(prompt, { creativity: "none" });
    const parsed = JSON.parse(response.trim());
    if (Array.isArray(parsed) && parsed.every((p: unknown) => typeof p === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function analyzeURL(url: string): Promise<URLAnalysis> {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { original: url, base: url, params: [], usedAI: false };
  }

  const base = `${urlObj.origin}${urlObj.pathname}${urlObj.hash}`;
  const allParams = Array.from(urlObj.searchParams.entries()).map(([name, value]) => ({ name, value }));

  if (allParams.length === 0) {
    return { original: url, base, params: [], usedAI: false };
  }

  const matchedRule = rules.find((rule) => url.includes(rule.url));
  let keepSet: Set<string>;
  let usedAI = false;

  if (matchedRule) {
    keepSet = new Set(matchedRule.allowParams);
  } else {
    const aiParams = await getAIAllowParams(url);
    if (aiParams !== null) {
      keepSet = new Set(aiParams);
      usedAI = true;
    } else {
      keepSet = new Set(allParams.map((p) => p.name).filter((n) => !TRACKING_PARAMS.includes(n)));
    }
  }

  return {
    original: url,
    base,
    usedAI,
    params: allParams.map((p) => ({
      name: p.name,
      value: p.value,
      keep: keepSet.has(p.name),
    })),
  };
}

export async function analyzeText(rawText: string): Promise<URLAnalysis[]> {
  const urls = findURLs(rawText);
  const analyses: URLAnalysis[] = [];
  for (const url of urls) {
    analyses.push(await analyzeURL(url));
  }
  return analyses;
}

export function buildCleanedText(rawText: string, analyses: URLAnalysis[]): string {
  const newURLs = analyses.map((a) => {
    const kept = a.params.filter((p) => p.keep);
    if (kept.length === 0) return a.base;
    const query = kept.map((p) => (p.value ? `${p.name}=${p.value}` : p.name)).join("&");
    return `${a.base}?${query}`;
  });
  return replaceURLs(rawText, newURLs);
}
