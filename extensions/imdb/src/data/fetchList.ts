import { z } from 'zod';

export const BaseItem = z.object({
  Title: z.string(),
  Year: z.string(),
  imdbID: z.string(),
  Type: z.string(),
  Poster: z.string(),
});
export type BaseItem = z.infer<typeof BaseItem>;

export const SuccessfulResponse = z.object({
  Search: z.array(BaseItem),
  totalResults: z.coerce.number(),
  Response: z.literal('True'),
});
export type SuccessfulResponse = z.infer<typeof SuccessfulResponse>;

export const FailedResponse = z.object({
  Response: z.literal('False'),
  Error: z.string().optional(),
});

const ItemResponse = z.union([SuccessfulResponse, FailedResponse]);
export type ItemResponse = z.infer<typeof ItemResponse>;

export const parseListResponse =
  (includeGames?: boolean) => async (res: Response) => {
    const payload = await res.json();
    const parsed = ItemResponse.safeParse(payload);

    if (parsed.success === false) {
      throw Error(parsed.error.toString());
    }

    const parsedData = parsed.data;

    if (
      parsedData.Response === 'False' &&
      parsedData.Error !== undefined &&
      parsedData.Error.endsWith('not found!')
    ) {
      return [];
    }

    if (parsedData.Response === 'False') {
      throw Error(parsedData.Error);
    }

    if (!res.ok) {
      throw Error(res.statusText);
    }

    const filteredItems = parsedData.Search.filter(
      (title) =>
        title.imdbID?.startsWith('tt') &&
        (includeGames || title.Type !== 'game'),
    );

    return filteredItems;
  };

export type ListEndpointType = 'movie' | 'series' | 'game';
export const getListEndpoint = (
  search: string,
  token: string,
  type?: ListEndpointType,
) => {
  const url = new URL(`https://www.omdbapi.com`);

  url.searchParams.set('s', search);
  url.searchParams.set('apikey', token);

  if (type !== undefined) {
    url.searchParams.set('type', type);
  }

  return url.toString();
};
