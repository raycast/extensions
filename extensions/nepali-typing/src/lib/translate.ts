export const parseTranslateResponse = (raw: unknown): string => {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`translate: malformed response: ${JSON.stringify(raw)?.slice(0, 200)}`);
  }
  const segments: unknown = raw[0];
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("translate: no segments in response");
  }
  const text: string = segments
    .map((segment: unknown): string => {
      const value: unknown = Array.isArray(segment) ? segment[0] : undefined;
      if (typeof value !== "string") {
        throw new Error("translate: malformed segment in response");
      }
      return value;
    })
    .join("");
  if (text.length === 0) {
    throw new Error("translate: empty translation");
  }
  return text;
};

const ENDPOINT: string = "https://translate.googleapis.com/translate_a/single";

export const fetchTranslation = async (text: string): Promise<string> => {
  const url: string =
    `${ENDPOINT}?client=gtx&sl=en&tl=ne&dt=t&q=${encodeURIComponent(text)}`;
  const res: Response = await fetch(url);
  if (!res.ok) {
    throw new Error(`translate: HTTP ${res.status} for "${text}"`);
  }
  const data: unknown = await res.json();
  return parseTranslateResponse(data);
};
