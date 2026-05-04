# Issue #12 / #13 実装プラン

## Context

両 issue は Raycast Preferences の `Message Template` 欄に対する UX 改善要望:

- **#12**「Message Template の欄を大きくする」: 現状 1 行の textfield では複数行テンプレートが編集しづらい。
- **#13**「Message Template のフォーマットガイドを情報アイコンに移動する」: 説明文が常時表示されて Preferences が冗長。

ただし **Raycast Preferences の制約** により両 issue とも Preferences レイヤでは解決不可:

- `Preference_2.type` は `appPicker | checkbox | dropdown | password | textfield | file | directory` のみで `textarea` 不可 (`node_modules/@raycast/api/types/index.d.ts:7688`)。
- `Preference_2` には `info` フィールドが存在しない。`info` プロップは `Form.*` コンポーネント (`FormItemProps_2.info`) 専用 (`node_modules/@raycast/api/types/index.d.ts:3537-3539`)。

→ **Message Template の編集 UI を Preferences から拡張機能内の Form に移行する** 方針を採る。Sub-form (Action.Push) 方式とし、フォーマットガイドは Sub-form 内の `Form.Description` としてテキストエリア直下に静的表示する (info icon は Sub-form では冗長なので不要、ユーザー判断)。

既存ユーザーの移行は不要 (現時点ユーザー想定なし) → preference 削除は破壊的に行う。

---

## Approach

### Sub-form 方式の構成

1. **Preference 削除**: `package.json:61-68` の `messageTemplate` エントリを削除。
2. **Template Editor サブビュー**を新規追加 (`src/template-editor.tsx`):
   - `Form.TextArea` でテンプレートを複数行編集可能。
   - 直下に `Form.Description` でプレースホルダ仕様を静的表示 (`{title}` / `{url}` / `{comment}` / `{link}` の説明、空 `{comment}` 行除去ルール)。
   - `Action.SubmitForm` で保存 → `popToRoot` ではなく `useNavigation().pop()` で呼び出し元 (link-note Form) に戻す。
   - リセット用の `Action` (例: "Reset to Default") も置く (任意・推奨)。
3. **永続化**: `@raycast/utils` の `useLocalStorage<string>("messageTemplate", DEFAULT_MESSAGE_TEMPLATE)` フックで一元管理 (`node_modules/@raycast/utils/dist/useLocalStorage.d.ts`)。
   - link-note 側でも同じフックで読み出し、送信時に `buildSlackText` に渡す。
   - 初回ロード中 (`isLoading`) は Form を loading 状態にして送信をブロック。
4. **Action 追加**: `link-note.tsx` の `<ActionPanel>` に `Action.Push title="Edit Message Template"` を追加 (ショートカット `⌘⇧T`)。
5. **共有定数の整理**: `DEFAULT_MESSAGE_TEMPLATE` と LocalStorage キーを新規 `src/lib/template.ts` に集約 (現状 `preferences.ts:19` に定義)。理由は「`messageTemplate` が preference でなくなるため、`preferences.ts` に残すと意味的にズレる」「link-note と template-editor の両方から参照する」。

### `src/lib/preferences.ts` の整理

- `RawPreferences.messageTemplate` (line 8) 削除。
- `Preferences.messageTemplate` (line 16) 削除。
- `DEFAULT_MESSAGE_TEMPLATE` (line 19) と関連フォールバックロジック (lines 32-35, 41) を削除。`src/lib/template.ts` から再 export しない (依存方向は `link-note.tsx` / `template-editor.tsx` → `lib/template.ts`)。

### `src/link-note.tsx` の変更点

- `useLocalStorage` で `template` 値と `isLoading` を取得。
- `prefs.messageTemplate` 参照 (line 44) を `template ?? DEFAULT_MESSAGE_TEMPLATE` に置き換え。
- `Form.isLoading` 条件に template の loading を追加 (`isLoadingTab || submitting || isLoadingTemplate`)。
- `<ActionPanel>` に `Action.Push title="Edit Message Template" target={<TemplateEditor />} shortcut={{ modifiers: ["cmd","shift"], key: "t" }} icon={Icon.Pencil}` を追加。

### `src/template-editor.tsx` (新規) の構成

```tsx
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { DEFAULT_MESSAGE_TEMPLATE, MESSAGE_TEMPLATE_KEY } from "./lib/template";

export default function TemplateEditor() {
  const { value, setValue, isLoading } = useLocalStorage<string>(MESSAGE_TEMPLATE_KEY, DEFAULT_MESSAGE_TEMPLATE);
  const { pop } = useNavigation();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const current = draft ?? value ?? DEFAULT_MESSAGE_TEMPLATE;
  // ... 保存時 await setValue(current); pop();
}
```

ガイドテキスト (Form.Description):

```
Placeholders:
  {title}   - Page title (mrkdwn-escaped)
  {url}     - Raw URL
  {comment} - Your comment (mrkdwn-escaped)
  {link}    - <url|title> Slack short link

Lines containing only an empty {comment} are removed.
```

### スコープ外

- 複数テンプレートのプリセット切替。
- quick-note 用テンプレート (現状 quick-note は template を使用しない、`quick-note.tsx:38`)。
- README/CHANGELOG の英語版翻訳 (既存方針に追従)。

---

## Critical files

| Path | 役割 | 関連 issue |
|---|---|---|
| `package.json` | `messageTemplate` preference 削除 (lines 61-68) | #12, #13 |
| `src/lib/preferences.ts` | `messageTemplate` 関連の型・フォールバック削除 (lines 8, 16, 19, 32-35, 41) | #12, #13 |
| `src/lib/template.ts` (新規) | `DEFAULT_MESSAGE_TEMPLATE` と `MESSAGE_TEMPLATE_KEY = "messageTemplate"` の export | #12, #13 |
| `src/template-editor.tsx` (新規) | Sub-form 本体 (`Form.TextArea` + `Form.Description`) | #12, #13 |
| `src/link-note.tsx` | `useLocalStorage` 連携、`Action.Push` 追加、template 参照置換 | #12, #13 |
| `README.md` | Message Template 編集導線の説明更新 (line 62 周辺の preferences 表を修正、新規 "Editing the message template" 節を追加) | #12, #13 |
| `CHANGELOG.md` | `[Unreleased]` に「Preference を撤去し Sub-form で編集」の旨を追記 | #12, #13 |

## Reused

- `Form.TextArea` パターン — `src/link-note.tsx:81-87` (Comment) と `src/quick-note.tsx:62` で既使用。
- `Form.Description` パターン — `src/link-note.tsx:80` (URL 表示) で既使用。
- `Action.SubmitForm` / `ActionPanel` パターン — `src/link-note.tsx:73-77`。
- `buildSlackText` — `src/lib/slack.ts:53` (シグネチャ変更なし、`template` 引数を localStorage 値で渡すだけ)。
- `useLocalStorage<T>(key, initialValue)` — `@raycast/utils` の標準フック (`node_modules/@raycast/utils/dist/useLocalStorage.d.ts`)。値は JSON 文字列として保存される。

## Verification

開発サーバーは `npm run dev` (= `ray develop`) で起動する。

1. **Lint/Build**: `npm run lint` がエラー 0 / `ray build` が通る。`raycast-env.d.ts` から `messageTemplate` が消えていることを確認。
2. **Preferences 表示**: Raycast Preferences → LinkNote Slack で `Message Template` 欄が表示されないこと。
3. **Sub-form 起動**: `Link Note to Slack` を開く → Action Panel に `Edit Message Template (⌘⇧T)` が出る → ショートカットで Sub-form に遷移。
4. **Sub-form 編集**: `Form.TextArea` が複数行入力可能 (改行で行が伸びる) で、直下に Placeholders ガイドが表示される (#12 ✓ #13 ✓)。
5. **保存 → 反映**: テンプレートを `:memo: {comment}\n→ {link}` に変更 → 保存 → link-note Form に戻る → Comment "test" で送信 → Slack 投稿が `:memo: test\n→ <url|title>` になる。
6. **永続化**: Raycast を一旦閉じて再起動 → Sub-form を再度開いて値が残っていること。
7. **デフォルト動作 (新規 install シナリオ)**: LocalStorage を `removeItem` した状態 (Sub-form の "Reset to Default" Action 経由 or 手動) で送信 → 既定値 `{comment}\n{link}` が使われ、コメント空時は `{comment}` 行が落ちる既存挙動が維持される。
8. **送信時 race condition**: link-note を開いた直後 (template まだ loading) に submit を試みても、Form 全体が loading 状態でブロックされて誤送信が起きないこと。
9. **Quick Note 非影響**: `Quick Note to Slack` の挙動は不変 (`quick-note.tsx` には変更なし)。

## 実装順序

1. `src/lib/template.ts` 新規作成 (`DEFAULT_MESSAGE_TEMPLATE`, `MESSAGE_TEMPLATE_KEY`)。
2. `src/template-editor.tsx` 新規作成 (`useLocalStorage` + `Form.TextArea` + `Form.Description` + Save Action + Reset Action)。
3. `src/link-note.tsx` を修正 (`useLocalStorage` 連携、`Action.Push` 追加、`prefs.messageTemplate` 参照を置換)。
4. `src/lib/preferences.ts` から `messageTemplate` 関連を削除。
5. `package.json` から `messageTemplate` preference を削除。
6. `npm run lint` / `ray build` 通過を確認。
7. `npm run dev` で動作確認 (Verification の各項目)。
8. `README.md` / `CHANGELOG.md` 更新。
