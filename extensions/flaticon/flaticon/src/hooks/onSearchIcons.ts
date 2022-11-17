import {useCachedPromise} from "@raycast/utils";
import {Token} from "./onAuth";

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
}

export default (token: Token, search = "") => {
  const {isLoading, data } = useCachedPromise(
    async (token: Token, search: string): Promise<IconResponse[] | undefined> => {
      if (!token.valid()) return;
      if (search.length === 0) return;

      console.debug("Fetching icons from API");
      const response = await fetch("https://api.flaticon.com/v3/search/icons?q="+encodeURIComponent(search), {
        headers: {Accept: 'application/json', ...token.auth()},
      });

      const body = await response.json() as {data: IconResponse[], error?: string};
      console.debug("Fetched icons from API, icons len", body.data?.length, "error", body.error);

      if (body.error) throw new Error(body.error);

      return body.data;
    },
    [token, search],
  );

  return {isLoading, data};
};
