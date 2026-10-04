import type { Emote, SearchArgs, Source, Variant } from "../types";

const ENDPOINT = "https://api.7tv.app/v4/gql";

const SEARCH = `query($query:String,$page:Int,$perPage:Int,$sort:Sort!,$filters:Filters){
  emotes{
    search(query:$query,page:$page,perPage:$perPage,sort:$sort,filters:$filters){
      items{ id defaultName flags{ animated nsfw } images{ url mime width height } }
    }
  }
}`;

type ApiImage = { url: string; mime: string; width: number; height: number };
type ApiEmote = {
  id: string;
  defaultName: string;
  flags: { animated: boolean; nsfw: boolean };
  images: ApiImage[];
};

function toVariants(images: ApiImage[], mime: string): Variant[] {
  return images
    .filter((i) => i.mime === mime)
    .map((i) => ({ url: i.url, height: i.height, mime: i.mime }))
    .sort((a, b) => a.height - b.height);
}

export const seventv: Source = {
  id: "7tv",
  title: "7TV",
  minQueryLength: 1,

  async search(
    { query, animatedOnly }: SearchArgs,
    signal?: AbortSignal,
  ): Promise<Emote[]> {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: signal ?? null,
      body: JSON.stringify({
        query: SEARCH,
        variables: {
          query,
          page: 1,
          perPage: 60,
          sort: { sortBy: "TOP_ALL_TIME", order: "DESCENDING" },
          filters: {
            animated: animatedOnly ? true : undefined,
            exactMatch: false,
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`7TV returned ${response.status}`);

    const body = (await response.json()) as {
      errors?: { message: string }[];
      data?: { emotes: { search: { items: ApiEmote[] } } };
    };
    const failure = body.errors?.[0];
    if (failure) throw new Error(failure.message);

    const items = body.data?.emotes.search.items ?? [];

    return items.flatMap((e) => {
      const animated = e.flags.animated;
      const variants = toVariants(
        e.images,
        animated ? "image/gif" : "image/png",
      );
      const smallest = variants[0];
      if (!smallest) return [];
      return [
        {
          key: `7tv:${e.id}`,
          name: e.defaultName,
          source: "7tv" as const,
          animated,
          nsfw: e.flags.nsfw,
          preview: (variants[1] ?? smallest).url,
          variants,
        },
      ];
    });
  },
};
