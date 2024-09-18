import { Token, tokenAuthHeader, tokenValid } from '../entities/Token';
import { FlatIcon } from '../entities/FlatIcon';
import fetch from 'cross-fetch';

export const searchIcons = async (token: Token, search: string): Promise<{ list: FlatIcon[]; error?: Error }> => {
  if (!tokenValid(token)) return { list: [] };
  if (search.length === 0) return { list: [] };

  const { list, error } = await makeRequestForIcons(token, search);

  return { list: list.map(mapResponseIconToFlatIcon), error };
};

const makeRequestForIcons = async (token: Token, search: string): Promise<{ list: IconResponse[]; error?: Error }> => {
  const params = new URLSearchParams({ q: search });
  const response = await fetch(`${uri}?${params}`, options(token));

  const body = (await response.json()) as { data?: IconResponse[]; status?: string; message?: string };

  if (body.status && body.status === 'error') return { list: [], error: new Error(body.message) };

  return { list: body.data ?? [] };
};

const uri = 'https://api.flaticon.com/v3/search/icons';
const options = (token: Token) => ({
  headers: { Accept: 'application/json', ...tokenAuthHeader(token) },
});

type IconResponse = {
  id: number;
  description: string;
  colors: number;
  color: string;
  shape: string;
  family_id: number;
  family_name: string;
  team_name: string;
  added: number;
  pack_id: number;
  pack_name: string;
  pack_items: number;
  tags: string;
  images: IconLinksResponse;
};

type IconLinksResponse = {
  '16': string;
  '24': string;
  '32': string;
  '64': string;
  '128': string;
  '256': string;
  '512': string;
};

const mapResponseIconToFlatIcon = ({ id, description, tags, images }: IconResponse): FlatIcon => ({
  id,
  description,
  tags: tags.split(','),
  sizes: { _512: images['512'] },
});
