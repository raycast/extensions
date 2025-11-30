# Prompt Storage API 使用例

このファイルは `promptStorage.ts` の使用方法を示すドキュメントです。

## 基本的な使い方

### 1. すべてのプロンプトを取得

```typescript
import { listPrompts } from "./lib/promptStorage";

async function loadAllPrompts() {
  const prompts = await listPrompts();
  // prompts は updatedAt 降順でソート済み
  console.log(`Found ${prompts.length} prompts`);
}
```

### 2. 特定のプロンプトを取得

```typescript
import { getPrompt } from "./lib/promptStorage";

async function loadPrompt(id: string) {
  const prompt = await getPrompt(id);

  if (prompt) {
    console.log("Found:", prompt.title);
  } else {
    console.log("Prompt not found");
  }
}
```

### 3. 新しいプロンプトを作成

```typescript
import { createPrompt } from "./lib/promptStorage";

async function addNewPrompt() {
  try {
    const newPrompt = await createPrompt({
      title: "My Prompt",
      body: "This is the prompt content",
      tags: ["work", "coding"],
    });

    console.log("Created prompt:", newPrompt.id);
  } catch (error) {
    console.error("Failed to create:", error);
  }
}
```

### 4. プロンプトを更新

```typescript
import { updatePrompt } from "./lib/promptStorage";

async function editPrompt(id: string) {
  try {
    // 部分的な更新が可能（指定したフィールドのみ更新）
    const updated = await updatePrompt(id, {
      title: "Updated Title",
      // body や tags は指定しなければ既存の値を保持
    });

    console.log("Updated:", updated.title);
  } catch (error) {
    console.error("Failed to update:", error);
  }
}
```

### 5. プロンプトを削除

```typescript
import { deletePrompt } from "./lib/promptStorage";

async function removePrompt(id: string) {
  try {
    await deletePrompt(id);
    console.log("Deleted successfully");
  } catch (error) {
    console.error("Failed to delete:", error);
  }
}
```

## React コンポーネントでの使用例

### List コンポーネント

```typescript
import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { listPrompts } from "./lib/promptStorage";
import { Prompt } from "./types/prompt";

export default function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await listPrompts();
      setPrompts(data);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.title}
          subtitle={prompt.body}
        />
      ))}
    </List>
  );
}
```

### Form コンポーネント

```typescript
import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { createPrompt, updatePrompt } from "./lib/promptStorage";
import { Prompt } from "./types/prompt";

interface FormProps {
  prompt?: Prompt;
  onSuccess: () => void;
}

export function PromptForm({ prompt, onSuccess }: FormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string; body: string; tags: string }) {
    setIsLoading(true);

    try {
      const tags = values.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (prompt) {
        // 更新
        await updatePrompt(prompt.id, {
          title: values.title,
          body: values.body,
          tags: tags.length > 0 ? tags : undefined,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Updated",
        });
      } else {
        // 新規作成
        await createPrompt({
          title: values.title,
          body: values.body,
          tags: tags.length > 0 ? tags : undefined,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Created",
        });
      }

      onSuccess();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={prompt ? "Update" : "Create"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={prompt?.title}
      />
      <Form.TextArea
        id="body"
        title="Body"
        defaultValue={prompt?.body}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={prompt?.tags?.join(", ")}
      />
    </Form>
  );
}
```

## 高度な使用例

### 検索機能

```typescript
import { searchPrompts, findPromptsByTag } from "./lib/promptStorage";

// キーワード検索
async function search(query: string) {
  const results = await searchPrompts(query);
  console.log(`Found ${results.length} results`);
}

// タグで絞り込み
async function filterByTag(tag: string) {
  const results = await findPromptsByTag(tag);
  console.log(`Found ${results.length} prompts with tag "${tag}"`);
}
```

### プロンプト数の取得

```typescript
import { countPrompts } from "./lib/promptStorage";

async function showStats() {
  const count = await countPrompts();
  console.log(`Total prompts: ${count}`);
}
```

### すべてクリア（開発/テスト用）

```typescript
import { clearAllPrompts } from "./lib/promptStorage";

async function resetData() {
  await clearAllPrompts();
  console.log("All prompts cleared");
}
```

## エラーハンドリング

すべての関数は例外をスローする可能性があるため、適切にハンドリングしてください：

```typescript
import { createPrompt } from "./lib/promptStorage";
import { showToast, Toast } from "@raycast/api";

async function safeCreate() {
  try {
    await createPrompt({
      title: "", // エラー: title が空
      body: "Test",
    });
  } catch (error) {
    // エラーメッセージをユーザーに表示
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create prompt",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

## 型安全性

TypeScript の型推論を活用してください：

```typescript
import { Prompt, CreatePromptInput, UpdatePromptInput } from "./types/prompt";

// 型推論が効く
const input: CreatePromptInput = {
  title: "Test",
  body: "Content",
  tags: ["tag1", "tag2"],
};

// 部分的な更新も型安全
const patch: UpdatePromptInput = {
  title: "New Title",
  // body や tags は省略可能
};
```
