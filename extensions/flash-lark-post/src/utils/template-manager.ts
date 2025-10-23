import { LocalStorage } from "@raycast/api";

export interface MemoTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  isPreset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TEMPLATES_STORAGE_KEY = "memo-templates";
const SELECTED_TEMPLATE_KEY = "selected-template-id";

// 破損したテンプレートデータをクリアする関数
export async function clearCorruptedTemplateData(): Promise<void> {
  try {
    console.log("🧹 破損したテンプレートデータをクリアしています...");
    await LocalStorage.removeItem(TEMPLATES_STORAGE_KEY);
    await LocalStorage.removeItem(SELECTED_TEMPLATE_KEY);
    console.log("✅ テンプレートデータをリセットしました");
  } catch (error) {
    console.error("❌ データクリアエラー:", error);
  }
}

// JSONデータの有効性をチェックする関数
function isValidTemplateData(data: any): data is MemoTemplate[] {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((template) => {
    return (
      template &&
      typeof template.id === "string" &&
      typeof template.name === "string" &&
      typeof template.content === "string" &&
      typeof template.category === "string" &&
      typeof template.isPreset === "boolean" &&
      template.id.length > 0 &&
      template.name.length > 0
    );
  });
}

// プリセットテンプレート
export const PRESET_TEMPLATES: MemoTemplate[] = [
  {
    id: "meeting-memo",
    name: "会議メモ",
    content: `📅 会議メモ
日時: 
参加者: 
議題: 

## 📝 議事録


## ✅ アクションアイテム
- [ ] 
- [ ] 

## 📌 次回までの宿題

`,
    category: "ビジネス",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "daily-report",
    name: "日報",
    content: `📊 日報 - {{date}}

## ✅ 今日の成果


## 📋 進行中のタスク


## 🚧 課題・問題点


## 📅 明日の予定

`,
    category: "レポート",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-reminder",
    name: "タスクリマインダー",
    content: `⏰ タスクリマインダー

## 🎯 優先度: 高
- [ ] 

## 📋 優先度: 中
- [ ] 

## 📝 優先度: 低
- [ ] 

期限: 
担当者: 
`,
    category: "タスク管理",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "project-update",
    name: "プロジェクト進捗",
    content: `🚀 プロジェクト進捗報告

プロジェクト名: 
期間: 

## 📈 進捗状況
完了率: %

## ✅ 完了したタスク


## 🔄 進行中のタスク


## ⚠️ 課題・リスク


## 📅 次のマイルストーン

`,
    category: "プロジェクト",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "quick-note",
    name: "クイックメモ",
    content: `💡 メモ

`,
    category: "一般",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-task",
    name: "タスク",
    content:
      "## タスク\n\n**期限**: \n**優先度**: \n**担当者**: \n\n### 詳細\n\n\n### チェックリスト\n- [ ] \n- [ ] \n- [ ] \n\n### 備考\n",
    category: "タスク",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-daily-report",
    name: "日報",
    content:
      "## 日報 - {{date}}\n\n### 今日の成果\n\n\n### 進行中のタスク\n\n\n### 明日の予定\n\n\n### 課題・相談事項\n\n\n### その他\n",
    category: "ビジネス",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-quick-note",
    name: "クイックメモ",
    content: "📝 {{time}} - ",
    category: "一般",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-reminder",
    name: "リマインダー",
    content:
      "⏰ リマインダー\n\n**期限**: \n**内容**: \n\n**重要度**: \n**関連者**: \n\n**備考**: ",
    category: "一般",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-bug-report",
    name: "バグ報告",
    content: `## バグ報告

**発見日時**: {{datetime}}
**環境**: 
**再現手順**:
1. 
2. 
3. 

**期待される動作**:


**実際の動作**:


**スクリーンショット**:


**優先度**: 
**担当者**: `,
    category: "開発",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-idea",
    name: "アイデアメモ",
    content: `## アイデア

**タイトル**: 
**日時**: {{datetime}}

### 概要


### 詳細


### メリット


### 課題・リスク


### 次のステップ
- [ ] 
- [ ] `,
    category: "クリエイティブ",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-feedback",
    name: "フィードバック",
    content: `## フィードバック

**対象**: 
**日時**: {{date}}
**評価者**: 

### 良かった点


### 改善点


### 具体的な提案


### 総合評価
`,
    category: "ビジネス",
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// テンプレート一覧を取得
export async function getTemplates(): Promise<MemoTemplate[]> {
  try {
    const stored = await LocalStorage.getItem<string>(TEMPLATES_STORAGE_KEY);
    let userTemplates: MemoTemplate[] = [];

    if (stored) {
      try {
        // JSONパースを試行
        const parsed = JSON.parse(stored);

        // データの有効性をチェック
        if (isValidTemplateData(parsed)) {
          userTemplates = parsed;
          console.log(`✅ ${userTemplates.length}件のユーザーテンプレートを読み込みました`);
        } else {
          console.warn("⚠️ 無効なテンプレートデータが検出されました。データをリセットします。");
          await clearCorruptedTemplateData();
        }
      } catch (parseError) {
        console.error("❌ テンプレートJSONパースエラー:", parseError);

        // エラーの詳細を分析
        if (parseError instanceof SyntaxError) {
          console.warn("🔧 JSON構文エラーが検出されました。破損したデータを自動修復します。");

          // 部分的なデータ復旧を試行
          try {
            const partialData = await attemptDataRecovery(stored);
            if (partialData && isValidTemplateData(partialData)) {
              userTemplates = partialData;
              console.log("🎉 データの部分復旧に成功しました");
            } else {
              throw new Error("復旧失敗");
            }
          } catch {
            console.warn("💥 データ復旧に失敗しました。完全リセットを実行します。");
            await clearCorruptedTemplateData();
          }
        } else {
          // その他のエラーの場合は完全リセット
          await clearCorruptedTemplateData();
        }

        userTemplates = [];
      }
    }

    // プリセットテンプレートとユーザーテンプレートを結合
    return [...PRESET_TEMPLATES, ...userTemplates];
  } catch (error) {
    console.error("❌ テンプレート取得エラー:", error);
    // 最悪の場合でもプリセットテンプレートは返す
    return PRESET_TEMPLATES;
  }
}

// データ復旧を試行する関数
async function attemptDataRecovery(corruptedData: string): Promise<MemoTemplate[] | null> {
  try {
    // 末尾の不正な文字を削除して再パース
    const trimmedData = corruptedData.trim();

    // 最後の完全なオブジェクトまでを抽出
    const lastBraceIndex = trimmedData.lastIndexOf("}");
    if (lastBraceIndex > 0) {
      const truncatedData = trimmedData.substring(0, lastBraceIndex + 1);

      // 配列の閉じ括弧を追加
      const fixedData = truncatedData.endsWith("]") ? truncatedData : truncatedData + "]";

      const recovered = JSON.parse(fixedData);
      if (isValidTemplateData(recovered)) {
        console.log("🔧 データの自動修復に成功");
        return recovered;
      }
    }

    return null;
  } catch (error) {
    console.warn("🚫 データ復旧失敗:", error);
    return null;
  }
}

// ユーザーテンプレートのみを取得
export async function getUserTemplates(): Promise<MemoTemplate[]> {
  try {
    const stored = await LocalStorage.getItem<string>(TEMPLATES_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      // パースしたデータが配列かどうかを確認
      if (Array.isArray(parsed)) {
        return parsed.filter((template) => {
          // 必要なプロパティが存在するかチェック
          return (
            template &&
            typeof template.id === "string" &&
            typeof template.name === "string" &&
            typeof template.content === "string" &&
            typeof template.category === "string" &&
            typeof template.isPreset === "boolean"
          );
        });
      } else {
        console.warn("保存されたテンプレートデータが配列ではありません。データをリセットします。");
        await LocalStorage.removeItem(TEMPLATES_STORAGE_KEY);
        return [];
      }
    } catch (parseError) {
      console.error("ユーザーテンプレートJSONパースエラー:", parseError);
      console.warn("破損したテンプレートデータを削除します。");
      await LocalStorage.removeItem(TEMPLATES_STORAGE_KEY);
      return [];
    }
  } catch (error) {
    console.error("ユーザーテンプレート取得エラー:", error);
    return [];
  }
}

// テンプレートを保存
export async function saveTemplate(
  template: Omit<MemoTemplate, "id" | "createdAt" | "updatedAt">
): Promise<MemoTemplate> {
  const userTemplates = await getUserTemplates();

  const newTemplate: MemoTemplate = {
    ...template,
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isPreset: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  userTemplates.push(newTemplate);
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(userTemplates));

  return newTemplate;
}

// テンプレートを更新
export async function updateTemplate(id: string, updates: Partial<MemoTemplate>): Promise<void> {
  const userTemplates = await getUserTemplates();
  const index = userTemplates.findIndex((t) => t.id === id);

  if (index === -1) {
    throw new Error("テンプレートが見つかりません");
  }

  userTemplates[index] = {
    ...userTemplates[index],
    ...updates,
    updatedAt: new Date(),
  };

  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(userTemplates));
}

// テンプレートを削除
export async function deleteTemplate(id: string): Promise<void> {
  const userTemplates = await getUserTemplates();
  const filtered = userTemplates.filter((t) => t.id !== id);
  await LocalStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
}

// テンプレートIDでテンプレートを取得
export async function getTemplateById(id: string): Promise<MemoTemplate | null> {
  const templates = await getTemplates();
  return templates.find((t) => t.id === id) || null;
}

// 選択されたテンプレートIDを保存
export async function setSelectedTemplate(id: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_TEMPLATE_KEY, id);
}

// 選択されたテンプレートIDを取得
export async function getSelectedTemplateId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(SELECTED_TEMPLATE_KEY)) || null;
}

// テンプレートの変数を置換
export function replaceTemplateVariables(content: string): string {
  const now = new Date();
  const today = now.toLocaleDateString("ja-JP");
  const time = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  return content
    .replace(/\{\{date\}\}/g, today)
    .replace(/\{\{time\}\}/g, time)
    .replace(/\{\{datetime\}\}/g, `${today} ${time}`);
}
