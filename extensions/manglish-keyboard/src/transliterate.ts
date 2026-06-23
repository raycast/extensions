type GoogleInputToolsResponse = [string, [string, string[], ...unknown[]][]];

export async function transliterate(input: string): Promise<string | null> {
  if (!input.trim()) return "";
  try {
    const word = encodeURIComponent(input.trim());
    const url = `https://inputtools.google.com/request?text=${word}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`transliterate: HTTP ${res.status} from inputtools`);
      return null;
    }
    const data = (await res.json()) as GoogleInputToolsResponse;
    // Response format: ["SUCCESS", [["input", ["output1", "output2"], ...]]]
    // Note: API can return SUCCESS with an empty candidates array (data[1] === [])
    // when it recognizes the request but has no transliteration for the input.
    if (data[0] === "SUCCESS") {
      const candidate = data[1]?.[0]?.[1]?.[0];
      if (candidate === undefined) {
        console.error("transliterate: SUCCESS response had no candidates", data);
      }
      return candidate ?? null;
    }
    console.error(`transliterate: API returned non-SUCCESS status: ${data[0]}`);
    return null;
  } catch (err) {
    console.error("transliterate: request failed", err);
    return null;
  }
}
