import { LocalStorage } from "@raycast/api";

export interface FeishuAuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const AUTH_STATE_KEY = "feishu-user-auth-state";

export async function readAuthState(): Promise<FeishuAuthState | undefined> {
  const raw = await LocalStorage.getItem<string>(AUTH_STATE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as FeishuAuthState;
    if (parsed.accessToken && parsed.refreshToken && typeof parsed.expiresAt === "number") {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function writeAuthState(state: FeishuAuthState): Promise<void> {
  await LocalStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
}
