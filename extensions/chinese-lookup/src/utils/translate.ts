import { execFile } from "child_process";
import { useEffect, useState } from "react";

export interface TranslationRequest {
  text: string;
  from: "en" | "zh-CN";
  to: "en" | "zh-CN";
}

export interface TranslationState {
  isLoading: boolean;
  result?: string;
  error?: string;
}

// Waits for a pause in typing so only what the user settles on is sent.
const DEBOUNCE_MS = 400;

const cache = new Map<string, string>();
const cacheKey = ({ text, from, to }: TranslationRequest) => `${from}>${to}:${text}`;

// Google's keyless translation endpoints, tried in order. Each is rate-limited separately, so
// when one starts refusing requests (429) the next still answers.
const ENDPOINTS: { url: (from: string, to: string) => string; parse: (data: unknown) => string }[] = [
  {
    // Google Dictionary's Chrome extension: ["translation"], or [["translation", "zh-CN"]].
    url: (from, to) => `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${from}&tl=${to}`,
    parse: (data) => {
      const [first] = data as (string | [string, string])[];
      return typeof first === "string" ? first : first[0];
    },
  },
  {
    // translate.google.com's widgets: [[[translated sentence, source sentence, ...], ...], ...].
    url: (from, to) => `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}`,
    parse: (data) => ((data as [[string][] | null])[0] ?? []).map(([sentence]) => sentence).join(""),
  },
];

// Google turns Node's HTTP clients away as automated traffic (429) but serves curl, so requests
// go through the curl that ships with macOS.
const post = (url: string, text: string, signal: AbortSignal) =>
  new Promise<unknown>((resolve, reject) => {
    const args = ["--silent", "--show-error", "--fail", "--max-time", "10", url, "--data-urlencode", `q=${text}`];
    execFile("/usr/bin/curl", args, { signal }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr.trim().replace(/^curl: \(\d+\) /, "") || error.message;
        reject(new Error(/\b429\b/.test(message) ? "Google Translate is limiting requests; try again later" : message));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Unexpected response from Google Translate"));
      }
    });
  });

const translate = async ({ text, from, to }: TranslationRequest, signal: AbortSignal) => {
  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      return endpoint.parse(await post(endpoint.url(from, to), text, signal));
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
};

export function useTranslation(request: TranslationRequest | undefined): TranslationState {
  const key = request ? cacheKey(request) : undefined;
  const [settled, setSettled] = useState<{ key: string; result?: string; error?: string }>();

  useEffect(() => {
    if (!request || !key || cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      translate(request, controller.signal)
        .then((result) => {
          cache.set(key, result);
          setSettled({ key, result });
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted) setSettled({ key, error: error.message });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  if (!key) return { isLoading: false };
  const cached = cache.get(key);
  if (cached !== undefined) return { isLoading: false, result: cached };
  if (settled?.key === key) return { isLoading: false, ...settled };
  return { isLoading: true };
}
