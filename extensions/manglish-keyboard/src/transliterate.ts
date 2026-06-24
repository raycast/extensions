type GoogleInputToolsResponse = [string, [string, string[], ...unknown[]][]];

// Module-level cache: persists for the lifetime of the Raycast process
const wordCache = new Map<string, string>();

async function fetchWord(word: string): Promise<string | null> {
  const encoded = encodeURIComponent(word);
  const url = `https://inputtools.google.com/request?text=${encoded}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`transliterate: HTTP ${res.status}`);
    return null;
  }

  const data = (await res.json()) as GoogleInputToolsResponse;
  if (data[0] !== "SUCCESS") {
    console.error(`transliterate: non-SUCCESS: ${data[0]}`);
    return null;
  }

  return data[1]?.[0]?.[1]?.[0] ?? null;
}

// Splits a raw token into [word, leadingPunct, trailingPunct]
function splitPunctuation(token: string): { word: string; leading: string; trailing: string } {
  const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]*)([^a-zA-Z]*)$/);
  return {
    leading: match?.[1] ?? "",
    word: match?.[2] ?? "",
    trailing: match?.[3] ?? "",
  };
}

export async function transliterate(input: string): Promise<string | null> {
  if (!input.trim()) return "";

  const tokens = input.trim().split(/\s+/);
  const parsed = tokens.map(splitPunctuation);

  // Only fetch non-empty words not already cached
  const uncached = parsed.map((p) => p.word).filter((w) => w.length > 0 && !wordCache.has(w));

  await Promise.all(
    uncached.map(async (word) => {
      const result = await fetchWord(word);
      if (result !== null) {
        wordCache.set(word, result);
      }
    }),
  );

  const parts = parsed.map(({ word, leading, trailing }) => {
    if (!word) return leading + trailing; // punctuation-only token
    const translated = wordCache.get(word);
    if (translated === undefined) return null;
    return leading + translated + trailing;
  });

  if (parts.some((p) => p === null)) return null;

  return parts.join(" ");
}
