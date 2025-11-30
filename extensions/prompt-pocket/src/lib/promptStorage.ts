import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import {
  CreatePromptInput,
  Prompt,
  sanitizePrompt,
  UpdatePromptInput,
} from "../types/prompt";
import {
  ErrorCode,
  PromptManagerError,
  toPromptManagerError,
} from "../types/errors";

/**
 * LocalStorage のキー
 */
const STORAGE_KEY = "prompts";

/**
 * ストレージからプロンプト配列を安全に読み込む
 */
async function loadPromptsFromStorage(): Promise<Prompt[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.error("Stored data is not an array");
      throw new PromptManagerError(
        "Invalid data format in storage",
        ErrorCode.STORAGE_READ_FAILED,
      );
    }

    // 各要素をサニタイズして有効なプロンプトのみを返す
    const prompts: Prompt[] = [];
    for (const item of parsed) {
      const sanitized = sanitizePrompt(item);
      if (sanitized) {
        prompts.push(sanitized);
      } else {
        console.warn("Skipped invalid prompt data:", item);
      }
    }

    return prompts;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new PromptManagerError(
        "Corrupted storage data",
        ErrorCode.STORAGE_READ_FAILED,
        error,
      );
    }
    throw toPromptManagerError(error, ErrorCode.STORAGE_READ_FAILED);
  }
}

/**
 * プロンプト配列をストレージに保存
 */
async function savePromptsToStorage(prompts: Prompt[]): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch (error) {
    console.error("Failed to save prompts to storage:", error);
    throw toPromptManagerError(error, ErrorCode.STORAGE_WRITE_FAILED);
  }
}

/**
 * すべてのプロンプトを取得
 * ソート順：利用が新しい順 → 登録が新しい順
 */
export async function listPrompts(): Promise<Prompt[]> {
  const prompts = await loadPromptsFromStorage();

  // 1. 利用が新しい順（lastUsedAt 降順）
  // 2. 登録が新しい順（createdAt 降順）
  return prompts.sort((a, b) => {
    // lastUsedAt が存在する場合、それを優先
    const aLastUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bLastUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;

    if (aLastUsed !== bLastUsed) {
      return bLastUsed - aLastUsed; // 利用が新しい順
    }

    // lastUsedAt が同じ（または両方未設定）の場合、createdAt で比較
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // 登録が新しい順
  });
}

/**
 * ID で特定のプロンプトを取得
 */
export async function getPrompt(id: string): Promise<Prompt | undefined> {
  const prompts = await loadPromptsFromStorage();
  return prompts.find((p) => p.id === id);
}

/**
 * 新しいプロンプトを作成
 */
export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  // バリデーション
  if (!input.title.trim()) {
    throw new PromptManagerError(
      "Title is required",
      ErrorCode.VALIDATION_FAILED,
    );
  }
  if (!input.body.trim()) {
    throw new PromptManagerError(
      "Body is required",
      ErrorCode.VALIDATION_FAILED,
    );
  }

  const now = new Date().toISOString();
  const newPrompt: Prompt = {
    id: uuidv4(),
    title: input.title.trim(),
    body: input.body.trim(),
    tags: input.tags && input.tags.length > 0 ? input.tags : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const prompts = await loadPromptsFromStorage();
  prompts.push(newPrompt);
  await savePromptsToStorage(prompts);

  return newPrompt;
}

/**
 * 既存のプロンプトを更新
 */
export async function updatePrompt(
  id: string,
  patch: UpdatePromptInput,
): Promise<Prompt> {
  const prompts = await loadPromptsFromStorage();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    throw new PromptManagerError(
      `Prompt with id "${id}" not found`,
      ErrorCode.PROMPT_NOT_FOUND,
    );
  }

  const existingPrompt = prompts[index];
  const now = new Date().toISOString();

  // パッチを適用（undefined のフィールドは既存の値を保持）
  const updatedPrompt: Prompt = {
    ...existingPrompt,
    title:
      patch.title !== undefined ? patch.title.trim() : existingPrompt.title,
    body: patch.body !== undefined ? patch.body.trim() : existingPrompt.body,
    tags:
      patch.tags !== undefined
        ? patch.tags.length > 0
          ? patch.tags
          : undefined
        : existingPrompt.tags,
    updatedAt: now,
  };

  // バリデーション
  if (!updatedPrompt.title) {
    throw new PromptManagerError(
      "Title cannot be empty",
      ErrorCode.VALIDATION_FAILED,
    );
  }
  if (!updatedPrompt.body) {
    throw new PromptManagerError(
      "Body cannot be empty",
      ErrorCode.VALIDATION_FAILED,
    );
  }

  prompts[index] = updatedPrompt;
  await savePromptsToStorage(prompts);

  return updatedPrompt;
}

/**
 * プロンプトを削除
 */
export async function deletePrompt(id: string): Promise<void> {
  const prompts = await loadPromptsFromStorage();
  const filtered = prompts.filter((p) => p.id !== id);

  if (filtered.length === prompts.length) {
    throw new PromptManagerError(
      `Prompt with id "${id}" not found`,
      ErrorCode.PROMPT_NOT_FOUND,
    );
  }

  await savePromptsToStorage(filtered);
}

/**
 * すべてのプロンプトをクリア（開発/テスト用）
 */
export async function clearAllPrompts(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

/**
 * プロンプトの総数を取得
 */
export async function countPrompts(): Promise<number> {
  const prompts = await loadPromptsFromStorage();
  return prompts.length;
}

/**
 * タグで検索
 */
export async function findPromptsByTag(tag: string): Promise<Prompt[]> {
  const prompts = await listPrompts();
  const lowerTag = tag.toLowerCase();

  return prompts.filter((p) =>
    p.tags?.some((t) => t.toLowerCase() === lowerTag),
  );
}

/**
 * キーワードで検索（タイトルと本文）
 */
export async function searchPrompts(query: string): Promise<Prompt[]> {
  const prompts = await listPrompts();
  const lowerQuery = query.toLowerCase();

  return prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.body.toLowerCase().includes(lowerQuery) ||
      p.tags?.some((t) => t.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * プロンプトの最終利用日時を更新
 */
export async function updateLastUsed(id: string): Promise<Prompt> {
  console.log(`[updateLastUsed] Updating last used time for prompt ${id}`);
  const prompts = await loadPromptsFromStorage();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    console.error(`[updateLastUsed] Prompt with id "${id}" not found`);
    throw new PromptManagerError(
      `Prompt with id "${id}" not found`,
      ErrorCode.PROMPT_NOT_FOUND,
    );
  }

  const now = new Date().toISOString();
  const updatedPrompt: Prompt = {
    ...prompts[index],
    lastUsedAt: now,
  };

  console.log(`[updateLastUsed] Updated prompt:`, updatedPrompt);
  prompts[index] = updatedPrompt;
  await savePromptsToStorage(prompts);

  console.log(`[updateLastUsed] Successfully saved to storage`);
  return updatedPrompt;
}
