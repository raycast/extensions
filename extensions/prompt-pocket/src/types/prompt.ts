/**
 * プロンプトのデータ構造
 */
export interface Prompt {
  /** 一意識別子 (UUID) */
  id: string;
  /** プロンプトのタイトル */
  title: string;
  /** プロンプト本体 */
  body: string;
  /** タグ（カテゴリ分類用） */
  tags?: string[];
  /** 作成日時 (ISO形式) */
  createdAt: string;
  /** 更新日時 (ISO形式) */
  updatedAt: string;
  /** 最終利用日時 (ISO形式) */
  lastUsedAt?: string;
}

/**
 * プロンプト作成時の入力データ
 */
export interface CreatePromptInput {
  title: string;
  body: string;
  tags?: string[];
}

/**
 * プロンプト更新時の部分データ
 */
export interface UpdatePromptInput {
  title?: string;
  body?: string;
  tags?: string[];
}

/**
 * プロンプト作成・編集用のフォーム値
 */
export interface PromptFormValues {
  title: string;
  body: string;
  tags: string;
}

/**
 * 型ガード: 未知のデータが Prompt かどうかを検証
 */
export function isValidPrompt(data: unknown): data is Prompt {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.body === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string" &&
    (obj.tags === undefined ||
      (Array.isArray(obj.tags) &&
        obj.tags.every((t) => typeof t === "string"))) &&
    (obj.lastUsedAt === undefined || typeof obj.lastUsedAt === "string")
  );
}

/**
 * 破損したデータをサニタイズして有効な Prompt に変換
 */
export function sanitizePrompt(data: unknown): Prompt | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // 必須フィールドが欠けている場合は null を返す
  if (
    typeof obj.id !== "string" ||
    typeof obj.title !== "string" ||
    typeof obj.body !== "string"
  ) {
    return null;
  }

  // 日付が不正な場合は現在時刻で補完
  const now = new Date().toISOString();
  const createdAt = typeof obj.createdAt === "string" ? obj.createdAt : now;
  const updatedAt = typeof obj.updatedAt === "string" ? obj.updatedAt : now;

  // tags が配列でない場合は undefined にする
  let tags: string[] | undefined;
  if (Array.isArray(obj.tags)) {
    tags = obj.tags.filter((t): t is string => typeof t === "string");
    if (tags.length === 0) {
      tags = undefined;
    }
  }

  // lastUsedAt の処理
  const lastUsedAt =
    typeof obj.lastUsedAt === "string" ? obj.lastUsedAt : undefined;

  return {
    id: obj.id,
    title: obj.title,
    body: obj.body,
    tags,
    createdAt,
    updatedAt,
    lastUsedAt,
  };
}
