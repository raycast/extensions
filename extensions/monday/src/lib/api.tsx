import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { BoardsResponse, Group, Me, User, BoardItemsReeponse } from "./models";
import { resetAllCaches } from "./persistence";

export async function runGraphQLQuery(query: string): Promise<any> {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: query }),
  });

  const json = await response.json();
  const record = json as Record<string, unknown>;
  const status = response.status;

  if (status >= 200 && status <= 299) {
    return record.data as any;
  } else if (status == 401 || status == 403) {
    await resetAllCaches();
    throw "Your credentials seem invalid. Check your API token in the extension's preferences.";
  } else if (status >= 400 && status <= 499) {
    throw "There's something funky in your request.\nIf the problem persists, please contact the developer.";
  } else if (status >= 500 && status <= 599) {
    throw "We're experiencing some technical difficulties, please try again later.\nIf the problem persists, please contact the developer.";
  }
}

export async function getBoardsAndUser(): Promise<BoardsResponse> {
  return (await runGraphQLQuery(`
    {
        me {
          id
          name
          account {
            id
            slug
          }
        }
        
        boards(limit: 50, order_by: used_at, state: active){
          id
          name
          updated_at
          description
          owner {
            id
            name
            title
            url
            birthday
            email
            created_at
            photo_thumb
            phone
            mobile_phone
            location
          }
          workspace {
            id
            name
          }
        }
    }
    `)) as BoardsResponse;
}

export async function getUser(): Promise<Me> {
  const result = await runGraphQLQuery(`
    {
        me {
          id
          name
          account {
            id
            slug
          }
        }
    }
    `);

  return (result as Record<string, unknown>).me as Me;
}

export async function getBoardAndUser(
  boardId: number
): Promise<BoardsResponse> {
  return (await runGraphQLQuery(`
    {
      me {
        id
        name
        account {
          id
          slug
        }
      }

      boards(ids: ${boardId}){
        id
        name
        updated_at
        description
        owner {
          id
          name
          title
          url
          birthday
          email
          created_at
          photo_thumb
          phone
          mobile_phone
          location
        }
        workspace {
          id
          name
        }
      }
    }
    `)) as BoardsResponse;
}

export async function getGroups(boardId: number): Promise<Group[]> {
  const result = await runGraphQLQuery(`
  {
    boards (ids: ${boardId.toString()}) {
        groups {
            id
            title
            color
            position
        }
    }
  }
  `);

  const data = result as Record<string, unknown>;
  const board = (data.boards as any)[0];
  return (board as Record<string, unknown>).groups as Group[];
}

export async function getTeam(): Promise<User[]> {
  const result = await runGraphQLQuery(`
  {
    users(kind:non_guests) {
      id
      name
      title
      url
      birthday
      email
      created_at
      photo_thumb
      phone
      location
    }
  }
  `);

  return (result as Record<string, unknown>).users as User[];
}

export async function addItem(
  boardId: number,
  groupId: string,
  name: string
): Promise<number> {
  const result = await runGraphQLQuery(`
    mutation {
        create_item (board_id: ${boardId}, group_id: "${groupId}", item_name: "${name.replace(
    /"/g,
    '\\"'
  )}") {
            id
        }
    }
    `);
  return result.create_item.id;
}

export async function getBoardItemsPage(boardId: number) {
  const result = (await runGraphQLQuery(`
    {
      boards (ids: ${boardId}, limit: 1){
        items_page(query_params: {order_by:[{column_id:"name"}]}) {
          items {
            id 
            name 
            updated_at
            url
            state
            group {
              title
            }
            column_values {
              text
              type
            }
          }
        }
      }
    }
    `)) as BoardItemsReeponse;
  return result.boards[0].items_page.items;
}
