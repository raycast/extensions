import { z } from 'zod';
import { BaseItem } from './fetchList';

const DetailedItem = BaseItem.extend({
  Rated: z.string(),
  Released: z.string(),
  Runtime: z.string(),
  Genre: z.string(),
  Director: z.string().optional(),
  Writer: z.string(),
  Actors: z.string(),
  Plot: z.string(),
  Language: z.string(),
  Country: z.string(),
  Awards: z.string(),
  Ratings: z.array(
    z.object({
      Source: z.string(),
      Value: z.string(),
    }),
  ),
  Metascore: z.string(),
  imdbRating: z.string(),
  imdbVotes: z.string(),
  DVD: z.string().optional(),
  BoxOffice: z.string().optional(),
  Production: z.string().optional(),
  Website: z.string().optional(),
  totalSeasons: z.string().optional(),
});
export type DetailedItem = z.infer<typeof DetailedItem>;

export const SuccessfulResponse = DetailedItem.extend({
  Response: z.literal('True'),
});
export type SuccessfulResponse = z.infer<typeof SuccessfulResponse>;

export const FailedResponse = z.object({
  Response: z.literal('False'),
  Error: z.string().optional(),
});

const ItemResponse = z.union([SuccessfulResponse, FailedResponse]);
export type ItemResponse = z.infer<typeof ItemResponse>;

export const parseDetailsResponse = async (res: Response) => {
  const payload = await res.json();
  const parsed = ItemResponse.safeParse(payload);

  if (parsed.success === false) {
    throw Error(parsed.error.toString());
  }

  const parsedData = parsed.data;

  if (parsedData.Response === 'False') {
    throw Error(parsedData.Error);
  }

  if (!res.ok) {
    throw Error(res.statusText);
  }

  return parsedData;
};

export const getDetailsEndpoint = (imdbID: string, token: string) => {
  const url = new URL(`https://www.omdbapi.com`);

  url.searchParams.set('i', imdbID);
  url.searchParams.set('apikey', token);
  return url.toString();
};
