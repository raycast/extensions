import { Emote, LIMIT } from "../components/emote";

export async function performSearch(searchText: string, signal: AbortSignal, page: number): Promise<Emote[]> {
  const params = new URLSearchParams();
  const blankQuery = "    ";
  params.append("query", searchText.length > 2 ? searchText : blankQuery);
  params.append("offset", String(LIMIT * page));
  params.append("limit", String(LIMIT));

  const response = await fetch("https://api.betterttv.net/3/emotes/shared/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json;
  const jsonResults = (json as unknown as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const emoteJson = jsonResult as Json;
    return {
      id: emoteJson.id as string,
      code: emoteJson.code as string,
      imageType: emoteJson.imageType as string,
    };
  });
}
