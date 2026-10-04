import type { Emote, SearchArgs, Source, Variant } from "../types";

const ENDPOINT = "https://api.betterttv.net/3/emotes/shared/search";
const CDN = "https://cdn.betterttv.net/emote";

const SCALE_HEIGHTS: Record<string, number> = { "1x": 28, "2x": 56, "3x": 112 };

type ApiEmote = {
  id: string;
  code: string;
  imageType: string;
  animated: boolean;
};

function toVariants(id: string, imageType: string): Variant[] {
  return Object.entries(SCALE_HEIGHTS).map(([scale, height]) => ({
    url: `${CDN}/${id}/${scale}`,
    height,
    mime: `image/${imageType}`,
  }));
}

export const bttv: Source = {
  id: "bttv",
  title: "BetterTTV",
  minQueryLength: 3,

  async search(
    { query, animatedOnly }: SearchArgs,
    signal?: AbortSignal,
  ): Promise<Emote[]> {
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&offset=0&limit=100`;
    const response = await fetch(url, {
      headers: { Referer: "https://betterttv.com/" },
      signal: signal ?? null,
    });

    if (!response.ok) throw new Error(`BetterTTV returned ${response.status}`);

    const items = (await response.json()) as ApiEmote[];

    return items
      .filter((e) => !animatedOnly || e.animated)
      .map((e) => ({
        key: `bttv:${e.id}`,
        name: e.code,
        source: "bttv" as const,
        animated: e.animated,
        nsfw: false,
        preview: `${CDN}/${e.id}/2x`,
        variants: toVariants(e.id, e.imageType),
      }));
  },
};
