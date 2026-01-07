import { get } from "./client";
import type { User, ApiResponse, PaginatedResponse } from "./types";

export async function getCurrentUser(): Promise<User> {
  const response = await get<ApiResponse<User>>("/me");
  return response.data;
}

export async function getUsers(): Promise<User[]> {
  const response = await get<PaginatedResponse<User>>("/users");
  return response.data;
}
