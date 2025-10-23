import { LocalStorage } from "@raycast/api";

export function decorateWithTimestamp(text: string, enabled: boolean): string {
  if (!enabled) return text;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `[${stamp}] ${text}`;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 1;
  const baseMs = opts.baseMs ?? 500;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt >= retries) throw e;
      const delay = baseMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

// Bot名キャッシュ機能
const DEFAULT_BOT_NAME_CACHE_KEY = "defaultBotName";
const DEFAULT_BOT_NAME_FALLBACK = "LarkCast";

/**
 * キャッシュされたデフォルトBot名を取得
 * @returns キャッシュされたBot名、またはフォールバック値
 */
export async function getCachedDefaultBotName(): Promise<string> {
  try {
    const cachedName = await LocalStorage.getItem<string>(DEFAULT_BOT_NAME_CACHE_KEY);
    if (cachedName && cachedName.trim()) {
      console.log(`📦 キャッシュからBot名を取得: ${cachedName}`);
      return cachedName;
    }
  } catch (error) {
    console.error("Bot名キャッシュ取得エラー:", error);
  }

  console.log(`📦 キャッシュなし、フォールバック値を使用: ${DEFAULT_BOT_NAME_FALLBACK}`);
  return DEFAULT_BOT_NAME_FALLBACK;
}

/**
 * デフォルトBot名をキャッシュに保存
 * @param botName 保存するBot名
 */
export async function setCachedDefaultBotName(botName: string): Promise<void> {
  try {
    if (botName && botName.trim()) {
      await LocalStorage.setItem(DEFAULT_BOT_NAME_CACHE_KEY, botName.trim());
      console.log(`💾 Bot名をキャッシュに保存: ${botName}`);
    }
  } catch (error) {
    console.error("Bot名キャッシュ保存エラー:", error);
  }
}

/**
 * Bot名キャッシュをクリア
 */
export async function clearCachedDefaultBotName(): Promise<void> {
  try {
    await LocalStorage.removeItem(DEFAULT_BOT_NAME_CACHE_KEY);
    console.log("🗑️ Bot名キャッシュをクリアしました");
  } catch (error) {
    console.error("Bot名キャッシュクリアエラー:", error);
  }
}
