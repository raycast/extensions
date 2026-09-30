import { client, getJwt } from "./lemmy";

export const search = async (query: string) => {
  const results = await client.search({
    auth: await getJwt(),
    q: query,
  });

  return results;
};
