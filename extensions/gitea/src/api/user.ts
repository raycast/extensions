import { getClient } from "./client";
import type { User } from "../types/api";

export async function getCurrentUser(): Promise<User> {
  const client = getClient();
  const { data, error } = await client.GET("/user");
  if (error) throw new Error("Failed to fetch current user");
  if (!data) throw new Error("No current user returned from server");
  return data;
}
