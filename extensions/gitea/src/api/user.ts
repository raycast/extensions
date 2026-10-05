import { getClient } from "./client";
import type { User } from "../types/api";
import { throwApiError } from "./errors";

export async function getCurrentUser(): Promise<User> {
  const client = getClient();
  const { data, error, response } = await client.GET("/user");
  if (error) throwApiError("Failed to fetch current user", error, response);
  if (!data) throw new Error("No current user returned from server");
  return data;
}
