import { iteratePaginatedAPI } from "@notionhq/client";

import { handleError, isNotNullOrUndefined } from "./global";
import { getNotionClient, NotionAccountId } from "./oauth";

export async function fetchUsers(accountId?: NotionAccountId) {
  try {
    const notion = await getNotionClient(accountId);
    const users = [];
    for await (const user of iteratePaginatedAPI(notion.users.list, {})) {
      users.push(user);
    }
    return users
      .map((x) => (x.object === "user" && x.type === "person" ? x : undefined))
      .filter(isNotNullOrUndefined)
      .map(
        (x) =>
          ({
            id: x.id,
            name: x.name,
            type: x.type,
            avatar_url: x.avatar_url,
          }) as User,
      );
  } catch (err) {
    return handleError(err, "Failed to fetch users", []);
  }
}
export interface User {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
}
