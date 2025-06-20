import { handleOnCatchError } from "../api/errors-helper";
import { YouTrackApi } from "../api/youtrack-api";
import { loadCache, saveCache } from "../cache";
import type { User } from "../interfaces";

type Input = {
  /**
   * The user username or name
   */
  name?: string;
};

function findUserByNameOrLoginOrEmail(users: User[], input: string): User | undefined {
  return users.find(({ fullName, login, email }) => fullName === input || login === input || email === input);
}

/**
 * Reads users from the cache, or fetches them from YouTrack if not present.
 */
export default async function getUsers(input: Input) {
  const api = YouTrackApi.getInstance();
  try {
    let users = await loadCache<User>("youtrack-users");
    if (!users.length) {
      const fetchedUsers = await api.fetchUsers();
      await saveCache("youtrack-users", fetchedUsers);
      users = users.concat(fetchedUsers);
    }

    if (!input.name) {
      return users;
    }

    const user = findUserByNameOrLoginOrEmail(users, input.name);
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    handleOnCatchError(error, "Error fetching users");
    throw error;
  }
}
