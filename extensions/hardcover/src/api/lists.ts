import { UNKNOWN_ERROR_MESSAGE } from "../helpers/errors";
import { HardcoverClient } from "./hardcoverClient";

export type List = {
  id: number;
  slug: string;
  name: string;
};

export type MeResponse = {
  data: {
    me: {
      id: number;
      lists: List[];
    }[];
  };
};

export async function getLists() {
  const client = new HardcoverClient();

  const graphql_query = `
    query {
      me {
        id
        lists {
          slug
          id
          name
        }
      }
    }
  `;

  const { data } = await client.post<MeResponse>(graphql_query);

  return data.me[0].lists;
}

export async function createList(
  name: string,
  privacySettingId: string,
  description: string,
  defaultView: string,
  ranked: boolean,
) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation {
      insert_list(
        object: {name: "${name}", ranked: ${ranked}, privacy_setting_id: ${privacySettingId}, description: "${description}", default_view: "${defaultView}"}
      ) {
        errors
        id
      }
    }
  `;

  const { data } = await client.post<{ data: { insert_list: { errors: string; id: number } } }>(graphql_mutation);

  // privacy setting. 1 = public, 2 = friends only, 3 = private.
  if (data.insert_list.errors) {
    console.log(data.insert_list.errors);
    const msg =
      data.insert_list.errors === "Name has already been taken" ? data.insert_list.errors : UNKNOWN_ERROR_MESSAGE;
    throw new Error(msg);
  }

  return data.insert_list.id;
}

export async function deleteList(listId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation {
      delete_list(id: ${listId}) {
        success
      }
    }
  `;

  const { data } = await client.post<{ data: { delete_list: { success: boolean } } }>(graphql_mutation);

  if (!data.delete_list.success) {
    console.log(data);
    throw new Error(UNKNOWN_ERROR_MESSAGE);
  }

  return data.delete_list.success;
}
