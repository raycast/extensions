import { handleError, isNotNullOrUndefined } from "./global";
import { getNotionClient } from "./oauth";

export async function fetchUsers() {
  try {
    const notion = getNotionClient();
    const users = await notion.users.list({});
    return users.results
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
