import { LocalStorage } from "@raycast/api";

export interface MessageHistory {
  id: string;
  content: string;
  destination: string;
  destinationName: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

const HISTORY_STORAGE_KEY = "message-history";
const MAX_HISTORY_ITEMS = 100;

// メッセージ履歴を取得
export async function getMessageHistory(): Promise<MessageHistory[]> {
  try {
    const historyJson = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
    if (!historyJson) return [];

    const history = JSON.parse(historyJson);
    return history.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.error("メッセージ履歴の読み込みエラー:", error);
    return [];
  }
}

// メッセージ履歴に追加
export async function addMessageToHistory(
  content: string,
  destination: string,
  destinationName: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const history = await getMessageHistory();

    const newMessage: MessageHistory = {
      id: generateId(),
      content,
      destination,
      destinationName,
      timestamp: new Date(),
      success,
      error,
    };

    // 新しいメッセージを先頭に追加
    history.unshift(newMessage);

    // 最大件数を超えた場合は古いものを削除
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("メッセージ履歴の保存エラー:", error);
  }
}

// 履歴を検索
export async function searchMessageHistory(query: string): Promise<MessageHistory[]> {
  const history = await getMessageHistory();
  const lowerQuery = query.toLowerCase();

  return history.filter(
    (message) =>
      message.content.toLowerCase().includes(lowerQuery) ||
      message.destinationName.toLowerCase().includes(lowerQuery)
  );
}

// 履歴をクリア
export async function clearMessageHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

// 特定の履歴項目を削除
export async function deleteMessageFromHistory(id: string): Promise<void> {
  try {
    const history = await getMessageHistory();
    const filteredHistory = history.filter((message) => message.id !== id);
    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error("メッセージ履歴の削除エラー:", error);
  }
}

// 履歴の統計情報を取得
export async function getHistoryStats(): Promise<{
  total: number;
  successful: number;
  failed: number;
  lastWeek: number;
}> {
  const history = await getMessageHistory();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return {
    total: history.length,
    successful: history.filter((m) => m.success).length,
    failed: history.filter((m) => !m.success).length,
    lastWeek: history.filter((m) => m.timestamp > oneWeekAgo).length,
  };
}

// IDを生成
// 最近使用したチャットの順序を取得（送信履歴順）
export async function getRecentChatOrder(): Promise<string[]> {
  try {
    const history = await getMessageHistory();

    // 成功した送信のみを対象とし、最新順にソート
    const successfulHistory = history
      .filter((item) => item.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 重複を除去して、最近使用したチャットIDの順序を取得
    const recentChatIds: string[] = [];
    const seenChatIds = new Set<string>();

    for (const item of successfulHistory) {
      if (!seenChatIds.has(item.destination)) {
        recentChatIds.push(item.destination);
        seenChatIds.add(item.destination);
      }
    }

    return recentChatIds;
  } catch (error) {
    console.error("最近のチャット順序取得エラー:", error);
    return [];
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
