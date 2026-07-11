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
    mutation InsertList($name: String, $default_view: String, $description: String, $privacy_setting_id: Int, $ranked: Boolean) {
      insert_list(
        object: {name: $name, default_view: $default_view, description: $description, privacy_setting_id: $privacy_setting_id, ranked: $ranked}
      ) {
        errors
        id
        list {
          id
          name
          default_view
        }
      }
    }
  `;

  const variables = {
    name: name,
    privacy_setting_id: Number(privacySettingId),
    description: description,
    default_view: defaultView,
    ranked: ranked,
  };

  const { data } = await client.post<{ data: { insert_list: { errors: string; id: number } } }>(
    graphql_mutation,
    variables,
  );

  if (data.insert_list.errors) {
    const msg =
      data.insert_list.errors === "Name has already been taken" ? data.insert_list.errors : UNKNOWN_ERROR_MESSAGE;
    throw new Error(msg);
  }

  return data.insert_list.id;
}

export async function deleteList(listId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation DeleteList($id: Int!) {
      delete_list(id: $id) {
        success
      }
    }
  `;

  const variables = {
    id: Number(listId),
  };

  const { data } = await client.post<{ data: { delete_list: { success: boolean } } }>(graphql_mutation, variables);

  if (!data.delete_list.success) {
    throw new Error(UNKNOWN_ERROR_MESSAGE);
  }

  return data.delete_list.success;
}
