export const parseInputToolsResponse = (raw: unknown): string[] => {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error(`inputtools: malformed response: ${JSON.stringify(raw)?.slice(0, 200)}`);
  }
  const status: unknown = raw[0];
  if (status !== "SUCCESS") {
    throw new Error(`inputtools: status ${String(status)}`);
  }
  const results: unknown = raw[1];
  const candidates: unknown = Array.isArray(results) ? (results[0] as unknown[] | undefined)?.[1] : undefined;
  if (!Array.isArray(candidates) || candidates.length === 0 || !candidates.every((candidate) => typeof candidate === "string")) {
    throw new Error("inputtools: no valid candidates in response");
  }
  return candidates;
};

const ENDPOINT: string = "https://inputtools.google.com/request";

export const fetchCandidates = async (text: string): Promise<string[]> => {
  const url: string =
    `${ENDPOINT}?text=${encodeURIComponent(text)}` +
    `&itc=ne-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;
  const res: Response = await fetch(url);
  if (!res.ok) {
    throw new Error(`inputtools: HTTP ${res.status} for "${text}"`);
  }
  const data: unknown = await res.json();
  return parseInputToolsResponse(data);
};

const SEGMENT_SPLIT: RegExp = /([,;\n]+)/;

export const segmentInput = (text: string): string[] => text.split(SEGMENT_SPLIT).filter((part: string) => part.length > 0);

export const isTransliterableSegment = (segment: string): boolean =>
  segment.trim().length > 0 && !SEGMENT_SPLIT.test(segment);

export const fetchTransliteration = async (text: string): Promise<string> => {
  const segments: string[] = segmentInput(text);
  const parts: string[] = await Promise.all(
    segments.map(async (segment: string): Promise<string> => {
      if (!isTransliterableSegment(segment)) {
        return segment;
      }
      const candidates: string[] = await fetchCandidates(segment);
      return candidates[0];
    }),
  );
  return parts.join("");
};
