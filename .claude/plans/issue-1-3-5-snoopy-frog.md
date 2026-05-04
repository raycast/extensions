# Issue #1 / #3 / #5 実装プラン

## Context

`linknote-slack` は 0.0.1 直後の Raycast 拡張で、現在のコマンドは `link-note` の 1 つのみ。3 つの open issue はいずれも体験向上のための小規模な機能追加で、`src/link-note.tsx` と `src/lib/*` の周辺で完結する。

- **Issue #1**「ページ Title を変更できるようにする」: 自動取得した Title が長い／不適切なケースで、送信前に編集できるようにしたい。
- **Issue #3**「メッセージフォーマットをカスタマイズ可能に」: 現状ハードコードの書式 (`{comment}\n<{url}|{title}>`) を、ユーザーが prefix／絵文字／改行構造などを含めて自由に変えられるようにしたい。
- **Issue #5**「URL なくても特定のチャンネルに送信できる」(本文: *思いついたアイデアとか咄嗟にメモる時に便利*): タブ URL なしでも Slack の特定チャンネルにメモを投げ込みたい。

3 つは独立に実装可能だが、Issue #3 のテンプレート機構は Issue #1 の編集後 title をそのまま流す形になるため、#1 → #3 → #5 の順で実装するとコンフリクトが起きにくい。

---

## Approach

### Issue #1: Title を Form フィールド化

**変更ファイル**: `src/link-note.tsx`

- `Form.Description title="Title"` (現行 `link-note.tsx:71`) を `Form.TextField id="title"` に差し替える。
- `useState<string>("")` で title state を持ち、`usePromise(getActiveTab)` の解決後に `useEffect` で `tab.title` を流し込む (ユーザー編集を踏み潰さないよう、初回のみ or 「未編集なら更新」のフラグで制御)。
- `handleSubmit` 内の `buildSlackText` 呼び出し (`link-note.tsx:33-37`) で `title` を state の値に置き換え。
- URL は引き続き `Form.Description` のまま (URL を編集するユースケースは薄く、誤操作リスクが大きい)。

### Issue #3: メッセージテンプレート preference

**変更ファイル**: `package.json`, `src/lib/preferences.ts`, `src/lib/slack.ts`, `src/link-note.tsx`

**設計**: Slack の text を生成するテンプレート文字列を preference に追加。プレースホルダは `{title}` / `{url}` / `{comment}` / `{link}` (= `<url|title>` の Slack リンク短縮形) の 4 種。

1. `package.json` の `preferences[]` に追加:
   ```json
   {
     "name": "messageTemplate",
     "title": "Message Template",
     "description": "Template for the Slack message. Placeholders: {title}, {url}, {comment}, {link}. Lines that contain only an empty {comment} are removed.",
     "type": "textfield",
     "required": false,
     "default": "{comment}\n{link}"
   }
   ```
2. `src/lib/preferences.ts` の `Preferences` 型に `messageTemplate: string` を追加。空文字なら default `"{comment}\n{link}"` にフォールバック。
3. `src/lib/slack.ts` の `buildSlackText` を変更:
   - 引数に `template: string` を追加。
   - `{title}` / `{comment}` は `escapeMrkdwn` 適用、`{url}` は無加工、`{link}` は現状の `<url|escaped_title>` 形に展開。
   - 置換後、行単位で「`comment` が空かつその行が `{comment}` 由来のみで構成されていた行」を削除する → comment が空のときに余計な改行が残らない。実装は: `{comment}` を一旦センチネル文字列に置換 → `comment` 空なら「センチネルを含み他に意味のあるトークンがない行」を削除 → 残ったセンチネルを実際の値に置換、の順。
   - `escapeMrkdwn` を `export` に変える (テスト容易性のため)。
4. `src/link-note.tsx` の `buildSlackText` 呼び出しに `template: prefs.messageTemplate` を渡す。

**スコープ外** (このプランでは扱わない): フォーム上でのプレビュー表示、コマンドごとのテンプレート分け。

### Issue #5: URL なし `quick-note` コマンドを追加

**変更ファイル**: `package.json`, `src/lib/preferences.ts`, `src/quick-note.tsx` (新規)

**設計**: 既存 `link-note` を分岐させずに、専用コマンド `quick-note` を新設する。理由は (a) `getActiveTab` のフォールバック・例外パスを完全に避けられる、(b) Raycast 側で別ホットキーを割り当てやすい、(c) 「特定のチャンネル」(=メモ専用チャンネル) のための既定値を独立に管理できる、の 3 点。

1. `package.json` の `commands[]` に追加:
   ```json
   {
     "name": "quick-note",
     "title": "Quick Note to Slack",
     "description": "Send a quick note to Slack without a browser URL.",
     "mode": "view"
   }
   ```
2. `package.json` の `preferences[]` に `quickNoteDefaultChannels` (textfield, optional, placeholder `idea`) を追加。意味は既存 `defaultChannels` と同じだが quick-note 用の独立既定値。
3. `src/lib/preferences.ts`:
   - `RawPreferences` に `quickNoteDefaultChannels?: string` を追加。
   - `Preferences` に `quickNoteDefaultChannels: string[]` を追加。`splitCsv` + `channels` 部分集合フィルタの既存ロジックを再利用。
4. `src/quick-note.tsx` (新規): `link-note.tsx` をベースに以下を変更:
   - `getActiveTab` / `usePromise` 削除、`Form.Description` の Title/URL も削除。
   - `comment` を必須化 (`Form.TextArea` の `info` で必須を明示、空のとき failure toast)。
   - 送信テキストは `comment` そのまま (escape は不要 — Slack mrkdwn の `&<>` は user note でも稀、現行実装と同じく素直に送る方針が一貫)。テンプレート機構 (Issue #3) は適用しない (URL/title が無いため)。
   - 既定選択は `prefs.quickNoteDefaultChannels`。
   - `postMessageToAll` を再利用。

---

## Critical files

| Path | 役割 | 関連 issue |
|---|---|---|
| `src/link-note.tsx` | Title 編集化、テンプレート適用 | #1, #3 |
| `src/lib/slack.ts` | `buildSlackText` のテンプレート対応 | #3 |
| `src/lib/preferences.ts` | `messageTemplate`, `quickNoteDefaultChannels` の読み込み | #3, #5 |
| `src/quick-note.tsx` (新規) | quick-note コマンド本体 | #5 |
| `package.json` | preferences・commands マニフェスト | #3, #5 |
| `CHANGELOG.md` | `[Unreleased]` に変更点を追記 | 全件 |
| `README.md` | 新コマンド・新 preference の説明追加 | #3, #5 |

## Reused

- `getActiveTab` — `src/lib/browser.ts:6` (link-note のみ。quick-note では使わない)
- `postMessageToAll` — `src/lib/slack.ts:42` (全 issue で共通)
- `escapeMrkdwn` — `src/lib/slack.ts:51` (export 化して #3 のテンプレート展開で再利用)
- `splitCsv` — `src/lib/preferences.ts:15` (#5 の `quickNoteDefaultChannels` パースで再利用)
- `Form.TagPicker` パターン — `src/link-note.tsx:80-84` (#5 の channel ピッカーで複製)

## Verification

開発サーバーは `npm run dev` (= `ray develop`) で起動する。

1. **共通**: `npm run lint` がエラー 0 / `ray build` が通る。
2. **Issue #1**: `Link Note to Slack` を開く → Title フィールドが編集可能で初期値に取得タブの title が入っている → 編集して送信 → Slack 投稿のリンクラベルが編集後の値になる。
3. **Issue #3 既定**: Preferences の Message Template 未設定 → コメントあり/なしの両方で送信し、現行と同一の出力 (`{comment}\n<url|title>` / `<url|title>`) になる。
4. **Issue #3 カスタム**: Template に `:memo: {comment}\n→ {link}` を設定 → コメント "test" → `:memo: test\n→ <url|title>`。コメント空 → `→ <url|title>` のみ (空 `{comment}` 行が削除される)。
5. **Issue #3 escape**: title に `<` `>` `&`、コメントに `<` を含めて送信 → Slack に正しくエスケープされて表示される。
6. **Issue #5 起動**: Raycast から `Quick Note to Slack` を起動 → URL/Title フィールドが無く、Comment と Channels だけ表示。`quickNoteDefaultChannels` の channel が初期選択。
7. **Issue #5 送信成功**: 任意の文字列 + 1 channel 以上で送信 → Slack にコメントだけが投稿される (URL なし)。
8. **Issue #5 失敗系**: 空コメント or channel 0 件で送信 → failure toast。
9. **チャンネル外しケース**: `quickNoteDefaultChannels` に `channels` に無い名前を入れても、既存の `defaultChannels` と同じく無視される (preferences.ts の filter ロジック由来)。

## 実装順序

1. Issue #1 (`link-note.tsx` の小改修)
2. Issue #3 (`slack.ts` 拡張 + preference 追加 + `link-note.tsx` 連携) — Issue #1 の state を踏襲
3. Issue #5 (新規コマンド + 新規 preference)
4. README / CHANGELOG 更新
