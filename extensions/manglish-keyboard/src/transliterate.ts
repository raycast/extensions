type GoogleInputToolsResponse = [string, [string, string[], ...unknown[]][]];

export async function transliterate(input: string): Promise<string | null> {
  if (!input.trim()) return "";
  try {
    const word = encodeURIComponent(input.trim());
    const url = `https://inputtools.google.com/request?text=${word}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const res = await fetch(url);
    const data = (await res.json()) as GoogleInputToolsResponse;
    // Response format: ["SUCCESS", [["input", ["output1", "output2"], ...]]]
    if (data[0] === "SUCCESS") {
      return data[1]?.[0]?.[1]?.[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
