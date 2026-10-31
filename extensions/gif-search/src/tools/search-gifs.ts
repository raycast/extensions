import { getAPIByServiceName } from "../hooks/useSearchAPI";
type Input = {
  /** Words that describe the GIF or reaction to find. */
  query: string;
  /** Search provider. Use giphy-clips for video clips and giphy-stickers for stickers; defaults to giphy. */
  service?:
    | "giphy"
    | "giphy-clips"
    | "giphy-stickers"
    | "klipy"
    | "klipy-stickers"
    | "klipy-clips"
    | "klipy-memes"
    | "finergifs";
};

/** Search a GIF provider and return media links and available source page links. */
export default async function searchGifs({ query, service = "giphy" }: Input) {
  const api = await getAPIByServiceName(service);
  if (!api) return [];

  const { results } = await api.search(query, { limit: 5 });
  return results.map((gif) => ({
    title: gif.title,
    mediaUrl: service === "giphy-clips" || service === "klipy-clips" ? gif.download_url : gif.gif_url,
    ...(gif.url ? { pageUrl: gif.url } : {}),
  }));
}
