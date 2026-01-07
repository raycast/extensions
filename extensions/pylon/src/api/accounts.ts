import { get } from "./client";
import type { Account, PaginatedResponse } from "./types";

export async function getAccounts(): Promise<Account[]> {
  const response = await get<PaginatedResponse<Account>>("/accounts");
  return response.data;
}
