# Issue #4: Slack チャンネルを動的に取得して選択可能にする

## Context

現状、送信先候補チャンネルは `channels` preference (CSV テキスト) で静的に管理しており、
ワークスペースのチャンネル変更があるたびにユーザーが手で更新する必要がある。
issue #4 はこの一覧を Slack API (`conversations.list`) から動的に取得し、
キャッシュ付きでフォームの `Form.TagPicker` に流し込めるようにする。

期待される結果:
- ユーザーは Slack 側のチャンネルを足すだけで Raycast 側に自動反映される
- 起動時はキャッシュから即座に描画 (ネットワーク待ちで詰まらない)
- 手動リフレッシュ (`⌘R`) で最新化可能
- 多ワークスペース切替時にキャッシュが汚染されない

## ユーザー確認済みの方針

| 論点 | 採用案 |
|---|---|
| 旧 `channels` preference | **完全削除** (breaking change) |
| 取得対象 | **公開 + Bot 参加済みプライベート** (`types=public_channel,private_channel`, `is_member` フィルタ無し) |
| TagPicker の内部値 | **チャンネル ID** (`C0123ABCD`)、表示は `#name` |
| ドキュメント | README / FAQ / CHANGELOG **すべて更新** |

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│ link-note.tsx / quick-note.tsx          │
│  └─ useChannels(token)                  │  React hook
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ src/lib/useChannels.ts                  │
│  └─ useCachedPromise から Cache 経由     │  キャッシュ層
│     (cache key = tokenFingerprint)      │
└────────────┬────────────────────────────┘
             │ cache miss / revalidate
┌────────────▼────────────────────────────┐
│ src/lib/channels.ts                     │
│  └─ fetchAllChannels(token)             │  ページネーション + 型変換
│     conversations.list を cursor 巡回    │
└────────────┬────────────────────────────┘
             │
       https://slack.com/api/conversations.list
```

**キャッシュ戦略**: `@raycast/utils` の `useCachedPromise` を採用。

理由:
- 起動時にキャッシュ済み値を即座に返し、バックグラウンドで再検証 (stale-while-revalidate)
- `revalidate()` で手動リフレッシュ実装が一行
- 内部で Raycast の `Cache` を使うので Raycast 再起動後も保持される
- TTL は付けず「マウントごとに必ずバックグラウンド再検証」とする (`conversations.list` は Tier 2 で十分余裕あり)

**キャッシュキー**: `[tokenFingerprint(token)]` (= トークン末尾 12 文字)。
生トークンをディスクキャッシュキーに書かず、かつワークスペース切替時にキー変動 → 自動キャッシュ分離。

**保存スキーマ**:
```ts
type ChannelCache = {
  channels: Array<{ id: string; name: string; isPrivate: boolean }>;
  fetchedAt: number;
};
```

## ファイル変更計画

### 新規作成

#### `src/lib/channels.ts`
ページネーション・エラー型・ID 解決を担当する純粋ロジック層。

```ts
export type SlackChannel = { id: string; name: string; isPrivate: boolean };
export type ChannelCache = { channels: SlackChannel[]; fetchedAt: number };

export class ChannelsScopeError extends Error {}     // missing_scope
export class ChannelsAuthError extends Error {}      // invalid_auth / not_authed / token_revoked
export class ChannelsNetworkError extends Error {}   // fetch reject

export async function fetchAllChannels(token: string): Promise<ChannelCache>;
export function tokenFingerprint(token: string): string;  // token.slice(-12)
export function resolveChannelIds(
  entries: string[],          // user 入力 (名前 or ID 混在)
  channels: SlackChannel[],
): string[];                   // 一覧と突合した有効 ID 配列
```

`fetchAllChannels` の挙動:
1. `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=1000&cursor=...` を `next_cursor` が空文字になるまでループ (ガード上限 50 ページ)
2. レスポンスの `data.channels` を `{ id, name, isPrivate: c.is_private }` に整形
3. `data.ok === false` のとき `error` を typed error にマップ
4. 名前の locale-aware (case-insensitive) ソート
5. `{ channels, fetchedAt: Date.now() }` を返す

`resolveChannelIds`: 各 entry が `^[CG][A-Z0-9]{8,}$` にマッチすれば ID として、
そうでなければ `name` として一覧から検索し、見つかれば ID を返す。

#### `src/lib/useChannels.ts`
```ts
export function useChannels(token: string): {
  channels: SlackChannel[];
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
};
```

実装方針: `useCachedPromise` の引数にはトークン本体は渡さず fingerprint のみ渡し、
fetch 関数は React closure で本物のトークンをキャプチャする。
これでキャッシュキーには指紋のみ・実 fetch は本物のトークンを使う、両立。

### 既存ファイル変更

#### `src/lib/preferences.ts`
- `RawPreferences` / `Preferences` から `channels` を削除
- `defaultChannels` / `quickNoteDefaultChannels` の「channels の部分集合」フィルタを除去
  (以後は実コマンド側で `resolveChannelIds` を呼ぶ)
- `splitCsv` は維持

#### `src/link-note.tsx`
- `useChannels(prefs.slackBotToken)` を呼び `channels` / `isLoadingChannels` / `channelsError` / `revalidateChannels` を取得
- `defaultSelectedIds = useMemo(() => resolveChannelIds(prefs.defaultChannels, channels), [channels])`
- `useEffect`: `selected.length === 0 && defaultSelectedIds.length > 0` のときのみ `setSelected(defaultSelectedIds)` (再検証時にユーザー選択を上書きしない)
- `Form.isLoading = isLoadingTab || submitting || isLoadingTemplate || (isLoadingChannels && channels.length === 0)`
  (キャッシュがあれば即操作可能、空なら待機)
- `Form.TagPicker.Item` を `value={c.id} title={"#" + c.name}` で生成
- ActionPanel に `Action title="Refresh Channels" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={revalidateChannels}` を追加
- `channelsError` 時は picker 上部に `Form.Description` で `Could not load: ${error.message}. ⌘R で再試行` を表示

#### `src/quick-note.tsx`
- link-note と同等の変更を `quickNoteDefaultChannels` ベースで実施 (テンプレート関連は触らない)

#### `package.json`
- `preferences` 配列から `channels` エントリ (lines 44-51) を削除
- `defaultChannels` / `quickNoteDefaultChannels` の `description` を「Comma-separated channel names or IDs to pre-select.」に更新 (「subset of Channels」表現を除去)

#### `raycast-env.d.ts`
- 自動再生成 (`ray develop` / `ray build` で更新される)

#### `README.md`
- Preferences 表 (lines 56-62) の **Channels** 行を削除
- Slack manifest (lines 30-41) と スコープ表 (lines 43-46) に `channels:read` (必須) と `groups:read` (推奨) を追記
- 「チャンネル候補は Slack から動的に取得 (キャッシュ付き、`⌘R` でリフレッシュ可)」の節を追加
- プライベートチャンネル節に `groups:read` がないと一覧に出ないことを追記

#### `docs/FAQ.md`
- Q2 の manifest YAML / スコープ表に `channels:read` / `groups:read` を追記
- Q2 Preferences 設定の表から `Channels` 行を削除、動的取得と `⌘R` リフレッシュを記載
- 「よくあるエラーと対処」の `channel_not_found` 行を、ID 直指定がスコープ範囲外のときに出る旨に更新
- `missing_scope` 行に「投稿時=`chat:write`、起動時=`channels:read`」の注記を追加

#### `CHANGELOG.md`
- `[Unreleased]` セクション以下:
  - **Added**: チャンネル一覧を `conversations.list` から動的取得 (キャッシュ付き、`⌘R` で手動リフレッシュ)
  - **Changed**: TagPicker 内部値をチャンネル ID 化 (リネーム耐性)。`defaultChannels` / `quickNoteDefaultChannels` は名前・ID どちらでも指定可
  - **Removed**: `channels` preference を撤去 (動的取得に移行)
  - **Breaking**: Slack App に `channels:read` (および推奨 `groups:read`) の追加 → Reinstall to Workspace が必要

## 実装順序

1. `src/lib/channels.ts` (純粋ロジック; ここから着手すると以後をユニット的に検証可)
2. `src/lib/useChannels.ts` (`useCachedPromise` 配線)
3. `src/lib/preferences.ts` (`channels` 撤去、フィルタ削除)
4. `src/link-note.tsx` (フック配線、ID picker、Refresh アクション、エラー表示)
5. `src/quick-note.tsx` (同上)
6. `package.json` (`channels` preference 撤去、説明文更新)
7. `npm run lint` & `ray build` 通過確認 (`raycast-env.d.ts` 自動更新)
8. `README.md` / `docs/FAQ.md` / `CHANGELOG.md`

## Critical Files

- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/lib/channels.ts` (新規)
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/lib/useChannels.ts` (新規)
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/lib/preferences.ts`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/link-note.tsx`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/quick-note.tsx`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/package.json`

## 再利用するもの

- `@raycast/utils` の `useCachedPromise` (キャッシュ + 再検証)、`useLocalStorage` (テンプレート読み出しは現状維持)
- `src/lib/preferences.ts:17-21` の `splitCsv` (defaultChannels パースに継続使用)
- `src/lib/slack.ts` の素 `fetch` パターン (新 `channels.ts` も依存追加なしで踏襲)
- `src/lib/template.ts` の定数モジュール構造 (channels.ts も同じ流儀で書く)

## Verification (Raycast dev mode end-to-end)

`npm run dev` 起動下で以下を確認:

1. **Lint / build**: `npm run lint` と `ray build` がエラーなし。`raycast-env.d.ts` から `channels` フィールドが消える
2. **Cold start**: Raycast 設定で extension をリセット → `Link Note to Slack` 起動 → 初回はチャンネル picker がローディング → 取得後に表示、`defaultChannels` で指定したものが pre-select される
3. **Warm start**: 一度終了 → 再起動。picker が即時にキャッシュから描画される (Network ログでバックグラウンド再検証も確認)
4. **ID 解決**: `defaultChannels = "general,C0123ABCD"` のように混在指定 → 両方とも pre-select 成功
5. **リネーム耐性**: Slack 側で `times-foo` → `times-bar` に改名 → 再起動 (or ⌘R) で新名で表示される。`defaultChannels` に ID で書いていた場合は引き続き pre-select
6. **⌘R リフレッシュ**: フォーム表示中に Slack で新チャンネル作成 → ⌘R で picker に即反映、トーストで完了表示
7. **Quick Note 同等性**: `Quick Note to Slack` でも同じ一覧、`quickNoteDefaultChannels` の pre-select、⌘R、送信が動作
8. **送信動作**: 実際に送信し Slack 側に届くこと (ID ベースで `chat.postMessage` が成功)
9. **エラー: missing_scope**: Slack App で `channels:read` を一時的に外して Reinstall → 起動 → picker は空、エラー説明が出る、フォームは壊れない、submit 時は既存の "Select at least one channel" トースト
10. **エラー: invalid_auth**: トークンを不正値に変更 → 同様にエラー説明・フォーム維持
11. **エラー: ネットワーク断**: Wi-Fi off → キャッシュがあれば旧データ表示、無ければエラー説明
12. **トークン切替 (ワークスペース切替)**: token を別ワークスペースのものに変更 → 別キャッシュキーで cold fetch される (前ワークスペースの一覧が漏れない)
13. **テンプレートエディタ無関係**: `Edit Message Template` の挙動が変わっていないこと

## リスク・留意点

1. **breaking change**: 既存ユーザーは Slack App に `channels:read` (推奨 `groups:read`) を追加して Reinstall しないと起動時にチャンネル取得が失敗する。CHANGELOG / README で明示する
2. **Tier 2 レート制限 (~20 req/min)**: 通常の起動・⌘R では問題なし。ただし ⌘R 連打で `ratelimited` になりうる → 5 秒以内の連打はトースト「Slack rate limit hit」で抑止する簡易スロットルを `revalidate` ラッパに入れる
3. **`next_cursor` の空文字判定**: Slack は最終ページで `""` を返す (`null` ではない)。ループは `cursor && cursor.length > 0` で判定すること
4. **大規模ワークスペース (10k+)**: 1000/page で 10 リクエストに収まる。TagPicker 自体は数千件まで実用範囲。アルファベット順ソート済みなので type-ahead で問題なし
5. **再検証中の表示揺れ**: 再検証で picker children が差し替わるが、`value` は ID なので選択状態は保持される。`title` のみ更新 (ユーザーが見ているラベルが一瞬変わる) → 動作上問題なし
6. **`@slack/web-api` は導入しない**: 既存 `slack.ts` と整合させるため素 `fetch` を維持。依存追加なし
7. **`defaultChannels` の archived 参照**: archived は `exclude_archived=true` で除外されるので、preference に古い名前が残っていた場合は静かに pre-select から落ちる (現状の挙動と同等)

