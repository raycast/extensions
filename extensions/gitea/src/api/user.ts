import { getClient } from "./client";
import type { User } from "../types/api";

export async function getCurrentUser(): Promise<User> {
  const client = getClient();
  const { data } = await client.rest.user.userGetCurrent();
  return data;
}
