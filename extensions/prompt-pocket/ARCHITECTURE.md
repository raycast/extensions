# Prompt Manager - アーキテクチャ概要

## 📁 プロジェクト構造

```
src/
├── types/
│   └── prompt.ts              # 型定義とバリデーション
├── lib/
│   ├── promptStorage.ts       # ストレージ層（データ操作）
│   └── USAGE_EXAMPLES.md      # 使用例ドキュメント
└── manage-prompts.tsx         # UI層（メインコマンド）
```

## 🏗️ レイヤー設計

### 1. 型定義層 (`src/types/prompt.ts`)

**役割**: データ構造の定義と型安全性の提供

**提供する型**:
- `Prompt` - プロンプトのデータ構造
- `CreatePromptInput` - 新規作成時の入力
- `UpdatePromptInput` - 更新時の部分入力
- `PromptFormValues` - フォーム用の値

**ユーティリティ関数**:
- `isValidPrompt()` - 型ガード
- `sanitizePrompt()` - データのサニタイズ

### 2. ストレージ層 (`src/lib/promptStorage.ts`)

**役割**: データの永続化とビジネスロジック

**公開 API**:

#### 基本操作
- `listPrompts(): Promise<Prompt[]>` - 全プロンプト取得（updatedAt 降順）
- `getPrompt(id): Promise<Prompt | undefined>` - ID で取得
- `createPrompt(input): Promise<Prompt>` - 新規作成
- `updatePrompt(id, patch): Promise<Prompt>` - 部分更新
- `deletePrompt(id): Promise<void>` - 削除

#### 追加機能
- `countPrompts(): Promise<number>` - 総数取得
- `searchPrompts(query): Promise<Prompt[]>` - キーワード検索
- `findPromptsByTag(tag): Promise<Prompt[]>` - タグ検索
- `clearAllPrompts(): Promise<void>` - 全削除（開発用）

**特徴**:
- ✅ updatedAt 降順で自動ソート
- ✅ バリデーション付き（空文字チェック等）
- ✅ 防御的実装（壊れたデータも処理可能）
- ✅ UUID による ID 自動生成
- ✅ タイムスタンプ自動管理

### 3. UI層 (`src/manage-prompts.tsx`)

**役割**: ユーザーインターフェースの提供

**コンポーネント**:
- `Command` - メインの List ビュー
- `PromptForm` - 作成・編集フォーム
- `PromptDetail` - 詳細表示

**機能**:
- プロンプト一覧表示
- リアルタイム検索
- CRUD 操作
- クリップボード連携
- ショートカット対応

## 🔒 型安全性の仕組み

### データバリデーション

```typescript
// 1. 型ガードによる検証
if (isValidPrompt(data)) {
  // data は Prompt 型として扱える
}

// 2. サニタイズによる回復
const prompt = sanitizePrompt(brokenData);
if (prompt) {
  // 壊れたデータでも修復して使える
}
```

### ストレージ層の防御

```typescript
async function loadPromptsFromStorage(): Promise<Prompt[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // 各要素をサニタイズ
    const prompts: Prompt[] = [];
    for (const item of parsed) {
      const sanitized = sanitizePrompt(item);
      if (sanitized) prompts.push(sanitized);
    }

    return prompts;
  } catch (error) {
    console.error("Failed to load:", error);
    return []; // エラー時も空配列を返して動作継続
  }
}
```

## 🎯 設計の利点

### 1. 関心の分離

- **型定義層**: データ構造のみを管理
- **ストレージ層**: データ操作のみを管理
- **UI層**: 表示とユーザー操作のみを管理

各層が独立しているため、変更の影響範囲が限定的。

### 2. テストしやすさ

```typescript
// ストレージ層は UI に依存しないため単体テスト可能
import { createPrompt, getPrompt } from "./lib/promptStorage";

test("creates and retrieves prompt", async () => {
  const created = await createPrompt({
    title: "Test",
    body: "Content",
  });
  
  const retrieved = await getPrompt(created.id);
  expect(retrieved).toEqual(created);
});
```

### 3. 再利用性

ストレージ層は他のコマンドからも利用可能：

```typescript
// 例: Quick Insert コマンド
import { listPrompts } from "./lib/promptStorage";

export default function QuickInsert() {
  const prompts = await listPrompts();
  // prompts を使って UI を構築
}
```

### 4. 保守性

各ファイルの責務が明確で、コードの場所を探しやすい：

- データ構造を変更したい → `types/prompt.ts`
- 保存ロジックを変更したい → `lib/promptStorage.ts`
- UI を変更したい → `manage-prompts.tsx`

## 🚀 拡張ポイント

### 1. 新しいフィールドの追加

```typescript
// 1. types/prompt.ts に追加
export interface Prompt {
  // ... 既存のフィールド
  isFavorite?: boolean;  // 新規追加
}

// 2. sanitizePrompt() を更新
export function sanitizePrompt(data: unknown): Prompt | null {
  // ... 既存のロジック
  const isFavorite = typeof obj.isFavorite === "boolean" 
    ? obj.isFavorite 
    : undefined;
  
  return { ...existing, isFavorite };
}

// 3. ストレージ層とUI層を必要に応じて更新
```

### 2. 新しい検索機能の追加

```typescript
// lib/promptStorage.ts に追加
export async function findFavoritePrompts(): Promise<Prompt[]> {
  const prompts = await listPrompts();
  return prompts.filter((p) => p.isFavorite === true);
}
```

### 3. 外部ストレージへの切り替え

`lib/promptStorage.ts` の内部実装を変更するだけで、UI 層は影響を受けない：

```typescript
// 例: Supabase への切り替え
import { supabase } from "./supabase";

export async function listPrompts(): Promise<Prompt[]> {
  const { data } = await supabase
    .from("prompts")
    .select("*")
    .order("updatedAt", { ascending: false });
  
  return data || [];
}
```

## 📖 参考

- 使用例: `src/lib/USAGE_EXAMPLES.md`
- 公式ドキュメント: https://developers.raycast.com/

