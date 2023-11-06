import { SearchResponse, ItemBase } from '../types';

export const parseResponse = async (
  res: Response
): Promise<ItemBase[] | null> => {
  const payload = (await res.json()) as SearchResponse;

  if (!res.ok && 'Error' in payload) {
    throw Error(payload.Error);
  } else if (!res.ok) {
    throw Error(res.statusText);
  } else if ('Search' in payload) {
    const filtered = payload.Search.filter(
      (title) => title.imdbID?.includes('tt') && title.Type !== 'game'
    );

    return filtered;
  } else {
    return null;
  }
};

export const processSeasons = (count?: string) => {
  if (count === 'N/A') {
    return 'N/A';
  } else if (Number(count) === 1) {
    return `${count} season`;
  } else {
    return `${count} seasons`;
  }
};
