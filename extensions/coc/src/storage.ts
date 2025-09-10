import { LocalStorage } from "@raycast/api";

export interface Timer {
  name: string;
  endTimestamp?: number;
}

export interface Account {
  name: string;
  timers: Timer[];
}

export async function getAccounts(): Promise<Account[]> {
  const data = await LocalStorage.getItem("accounts");
  return data ? JSON.parse(data as string) : [];
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem("accounts", JSON.stringify(accounts));
}
