import type { Emote, SearchArgs, Source, Variant } from "../types";

const ENDPOINT = "https://api.frankerfacez.com/v1/emoticons";

const SCALES = [1, 2, 4] as const;

type ApiEmote = {
  id: number;
  name: string;
  height: number;
  urls: Record<string, string>;
  animated?: Record<string, string>;
};

function toVariants(emote: ApiEmote): Variant[] {
  const animated = Boolean(emote.animated);
  return SCALES.flatMap((scale) => {
    const base = animated
      ? emote.animated?.[String(scale)]
      : emote.urls[String(scale)];
    if (!base) return [];
    return [
      {
        url: animated ? `${base}.webp` : base,
        height: emote.height * scale,
        mime: animated ? "image/webp" : "image/png",
      },
    ];
  });
}

export const ffz: Source = {
  id: "ffz",
  title: "FrankerFaceZ",
  minQueryLength: 2,

  async search(
    { query, animatedOnly }: SearchArgs,
    signal?: AbortSignal,
  ): Promise<Emote[]> {
    const params = new URLSearchParams({
      q: query,
      per_page: "100",
      sort: "count-desc",
    });
    if (animatedOnly) params.set("animated", "true");

    const response = await fetch(`${ENDPOINT}?${params}`, {
      signal: signal ?? null,
    });
    if (!response.ok)
      throw new Error(`FrankerFaceZ returned ${response.status}`);

    const body = (await response.json()) as { emoticons: ApiEmote[] };

    return body.emoticons.flatMap((emote) => {
      const variants = toVariants(emote);
      const smallest = variants[0];
      if (!smallest) return [];
      return [
        {
          key: `ffz:${emote.id}`,
          name: emote.name,
          source: "ffz" as const,
          animated: Boolean(emote.animated),
          nsfw: false,
          preview: (variants[1] ?? smallest).url,
          variants,
        },
      ];
    });
  },
};
