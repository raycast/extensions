import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { BoardsResponse, Group, Me, User } from "./models";

export async function runGraphQLQuery(query: string): Promise<any> {
  const apiKey = getPreferenceValues().apiKey;
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: query }),
  });
  const json = await response.json();
  return (json as Record<string, unknown>).data as any;
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
        create_item (board_id: ${boardId}, group_id: "${groupId}", item_name: "${name}") {
            id
        }
    }
    `);

  return result.create_item.id;
}
