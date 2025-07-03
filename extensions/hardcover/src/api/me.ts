import { HardcoverClient } from "./hardcoverClient";

export type CurrentUser = {
  id: number;
  username: string;
  name: string;
};

export type MeResponse = {
  data: {
    me: CurrentUser[];
  };
};

export async function getMe() {
  const client = new HardcoverClient();

  const graphql_query = `
    query {
      me {
        id
        username
        name
      }
    }
  `;

  const { data } = await client.post<MeResponse>(graphql_query);

  return data.me[0] as CurrentUser;
}
