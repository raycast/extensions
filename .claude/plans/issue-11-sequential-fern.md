# Issue #11: 送信チャンネルプリセットを Deeplink (Quicklink) で呼び出せるようにする

## Context

現状、送信先チャンネルの初期選択は preferences の `defaultChannels` / `quickNoteDefaultChannels`
(各コマンドにつき 1 セットの CSV) でしか持てず、用途別に切り替えるには毎回 Raycast Settings を
開いて書き換える必要がある。

Issue #11 は「`general,ideas` のような送信先プリセットを deeplink で指定し、
用途に応じてすぐに呼び出せるようにしたい (deeplink でなくとも Raycast 上で簡単に呼び出せれば可)」
という要望。

期待される結果:

- 用途別プリセット (例: `Link Note → ideas`, `Link Note → eng+research`) を任意個作れる
- 1 押し / 1 タイプで該当プリセット入りの Form を即起動できる
- 既存の `defaultChannels` フォールバックは維持 (非破壊)

## ユーザー確認済みの方針

| 論点 | 採用案 |
|---|---|
| 実装パス | **Path A**: Raycast `launchContext` を受け取り、`Action.CreateQuicklink` で 1 ステップで Quicklink 化 |
| Quicklink に埋め込む識別子 | **チャンネル ID** (`C0123ABCD`) — リネーム耐性、TagPicker 内部値そのまま流せる |
| 既存 `defaultChannels` preference | **存続**。launchContext 解決成功時のみそちらを優先、完全失敗時はフォールバック |
| 対象コマンド | `link-note` / `quick-note` 両方 (`template-editor` は対象外) |

## アーキテクチャ

```
                         ┌──────────────────────────────────┐
                         │ Raycast Quicklink (ユーザー登録)  │
                         │  link: raycast://...?context=... │
                         │  hotkey 任意                     │
                         └────────────┬─────────────────────┘
                                      │ launch
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│ link-note.tsx / quick-note.tsx                              │
│  Command(props: LaunchProps<{ launchContext: Ctx }>)        │
│   ├ launchContextChannelIds = resolveChannelIds(            │
│   │      props.launchContext.channels, channels)            │
│   ├ defaultSelectedIds = resolveChannelIds(                 │
│   │      prefs.defaultChannels, channels)                   │
│   ├ initialSelectedIds = launchContextChannelIds.length > 0 │
│   │      ? launchContextChannelIds                          │
│   │      : defaultSelectedIds                               │
│   └ useEffect: selected.length === 0 のとき setSelected(...)│
└────────────┬────────────────────────────────────────────────┘
             │ pre-select 反映
             ▼
       Form.TagPicker (Issue #4 で ID 化済)

ActionPanel (Form 内):
  └ <Action.CreateQuicklink quicklink={{
        link: buildQuicklink(<command>, { channels: selected }),
        name: `${commandTitle} → ${shortLabel}`
    }} />
                         │
                         ▼
              Raycast 標準の Create Quicklink ダイアログ
              (URL/Name 編集可、保存後に Settings でホットキー割当)
```

## ファイル変更計画

### 新規作成

#### `src/lib/deeplink.ts`

```ts
const EXTENSION_AUTHOR = "peinan";
const EXTENSION_NAME = "raycast-linknote-slack";

export type CommandName = "link-note" | "quick-note";

export type ChannelPresetContext = {
  channels: string[];
};

export function buildQuicklink(command: CommandName, context: ChannelPresetContext): string {
  const url = new URL(`raycast://extensions/${EXTENSION_AUTHOR}/${EXTENSION_NAME}/${command}`);
  url.searchParams.set("context", JSON.stringify(context));
  return url.toString();
}
```

採用理由:

- `src/lib/` の責務分割流儀 (`channels.ts` / `slack.ts` / `template.ts` / `preferences.ts`) と整合
- `package.json` の `name` / `author` に依存する URL 組立を 1 箇所に集約
- `URL` + `searchParams.set` で `JSON.stringify` 結果のクォート・カンマ・コロンが確実にパーセントエンコードされる

### 既存ファイル変更

#### `src/link-note.tsx`

(1) インポート追加・シグネチャ変更 (現 line 1-12):

```ts
import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
// ... 既存 import
import { buildQuicklink, type ChannelPresetContext } from "./lib/deeplink";

export default function Command(props: LaunchProps<{ launchContext: ChannelPresetContext }>) {
```

`LaunchContext` (`index.d.ts:6128`) は `[item: string]: any` を持つので
`ChannelPresetContext extends LaunchContext` は型上満たされる。

(2) launchContext 解決と pre-select 優先順位 (現 line 30 付近を差し替え):

```ts
const launchContextEntries = useMemo<string[]>(() => {
  const raw = props.launchContext?.channels;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string");
}, [props.launchContext]);

const launchContextChannelIds = useMemo(
  () => resolveChannelIds(launchContextEntries, channels),
  [launchContextEntries, channels],
);

const defaultSelectedIds = useMemo(
  () => resolveChannelIds(prefs.defaultChannels, channels),
  [channels],
);

const initialSelectedIds = useMemo(
  () => (launchContextChannelIds.length > 0 ? launchContextChannelIds : defaultSelectedIds),
  [launchContextChannelIds, defaultSelectedIds],
);
```

優先順位:

1. `launchContextChannelIds.length > 0` → これを使う (= launchContext を指定された意図を尊重)
2. それ以外 → `defaultChannels` preference にフォールバック (= 完全失敗時に Form が空になるのを避ける)

`Array.isArray` ガードは "悪意ある" deeplink ではなく型安全のため
(`launchContext` の型は `[k: string]: any` なので何でも来うる)。

(3) 既存の useEffect (現 line 38-42) を `initialSelectedIds` に切替:

```ts
useEffect(() => {
  if (selected.length === 0 && initialSelectedIds.length > 0) {
    setSelected(initialSelectedIds);
  }
}, [initialSelectedIds]);
```

`selected.length === 0` ガードは現状動作維持
(= ユーザーが手動で外したものを channels の revalidate で勝手に上書きしない)。

(4) 未解決チャンネルの toast (新規):

```ts
useEffect(() => {
  if (launchContextEntries.length === 0) return;
  if (channels.length === 0) return; // loading 中は判定保留
  if (launchContextChannelIds.length >= launchContextEntries.length) return;

  const isId = (s: string) => /^[CG][A-Z0-9]{8,}$/.test(s);
  const unknown = launchContextEntries.filter((entry) =>
    isId(entry)
      ? !channels.some((c) => c.id === entry)
      : !channels.some((c) => c.name === entry),
  );
  if (unknown.length > 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "Unknown channels in preset",
      message: unknown.join(", "),
    });
  }
}, [launchContextEntries, launchContextChannelIds, channels]);
```

部分失敗時は **解決できた分だけ** pre-select し、解決失敗分を toast で通知。
完全失敗時は (1) のフォールバックで `defaultChannels` が反映される。

(5) ActionPanel に `Action.CreateQuicklink` 追加 (現 line 96-110):

```tsx
const selectedChannelNames = useMemo(
  () =>
    selected
      .map((id) => channels.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n)),
  [selected, channels],
);

const quicklinkSuggestedName = useMemo(() => {
  if (selectedChannelNames.length === 0) return undefined;
  const head = selectedChannelNames.slice(0, 3).map((n) => `#${n}`).join(", ");
  const suffix = selectedChannelNames.length > 3 ? ` +${selectedChannelNames.length - 3}` : "";
  return `Link Note → ${head}${suffix}`;
}, [selectedChannelNames]);

// ActionPanel 内
{selected.length > 0 && (
  <Action.CreateQuicklink
    title="Save as Quicklink Preset"
    icon={Icon.Link}
    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
    quicklink={{
      link: buildQuicklink("link-note", { channels: selected }),
      name: quicklinkSuggestedName,
    }}
  />
)}
```

- `selected.length === 0` のとき非表示 (空配列の Quicklink を作らせない)
- `Action.CreateQuicklink` は Raycast の Create Quicklink ダイアログを開いて
  Link/Name を pre-fill する。ユーザーは編集 → 保存 → 後で Settings で hotkey 割当
- shortcut `⌘⇧L` (`l` = link) は `template-editor` の `⌘⇧T` と並列、衝突なし

#### `src/quick-note.tsx`

`link-note.tsx` と完全に同型の変更を実施:

- import / シグネチャ変更 (`LaunchProps<{ launchContext: ChannelPresetContext }>`)
- `launchContextEntries` / `launchContextChannelIds` / `initialSelectedIds` を `quickNoteDefaultChannels`
  ベースで構成 (現 line 20-26)
- 未解決チャンネル toast を同形式で追加
- ActionPanel に `Action.CreateQuicklink`:
  - `link: buildQuicklink("quick-note", { channels: selected })`
  - `name: "Quick Note → " + 同じ生成ルール`
  - shortcut `⌘⇧L`

ロジックが対称になるが、State 形と props ハンドリングが React 関数本体に強く絡んでいるため、
共通 hook 抽出はしない (Issue #4 で 2 ファイル並列に書いた流儀を踏襲)。

#### `README.md`

「### 2. Raycast 拡張に Preferences を設定」(現 line 56-66) と
「#### チャンネル候補について」(現 line 68-73) のあいだに新節を挿入:

```markdown
### 3. チャンネルプリセットを Quicklink で呼び出す

用途別 (例: `general` + `ideas` の "アイデア共有プリセット") に送信先を瞬時に切り替えたい場合、
Raycast の Quicklink を使うと 1 押しで該当プリセット入りの Form を開ける。

1. **Link Note to Slack** (または **Quick Note to Slack**) を起動し、Channels で目的のチャンネル群を選択する
2. Action Panel から **Save as Quicklink Preset** (`⌘⇧L`) を選ぶ
3. Raycast 標準の Create Quicklink ダイアログが開く (Link / Name は pre-fill 済み)。Name を分かりやすく書き換えて保存
4. **Raycast Settings → Extensions → Quicklinks** で当該 Quicklink を選び、**Hotkey** または **Alias** を割り当てれば 1 押し / 1 タイプで起動できる

Quicklink の URL に埋め込まれているのはチャンネル ID (`C0123ABCD`) なので、Slack 側でチャンネル名を変更しても Quicklink は壊れない。一方、別ワークスペースに Bot Token を切り替えると ID が一致しないため Quicklink は再生成が必要。
```

#### `CHANGELOG.md`

`[Unreleased]` の `### Added` セクション末尾に追記:

```
- `link-note` / `quick-note` が `launchContext` 経由で `{ channels: string[] }` を受け取り、起動時のチャンネル選択に反映するようになった (関連: #11)
- Action Panel に **Save as Quicklink Preset** (`⌘⇧L`) を追加。現在選択中の Channels をプリセット化した Raycast Deeplink (`raycast://extensions/peinan/raycast-linknote-slack/<command>?context=...`) を Create Quicklink ダイアログに pre-fill 投入する。Quicklink + ホットキー割当で用途別プリセットを 1 押し起動可能 (link-note / quick-note 両対応) (関連: #11)
```

## 実装順序

1. `src/lib/deeplink.ts` 新規 (`CommandName`, `ChannelPresetContext`, `buildQuicklink`)
2. `src/link-note.tsx` 修正 (シグネチャ、`initialSelectedIds`、未解決 toast、`Action.CreateQuicklink`)
3. `src/quick-note.tsx` 修正 (上と同型変更)
4. `npm run lint` / `ray build` 通過確認
5. `npm run dev` で「検証」節を消化
6. `README.md` に「### 3. チャンネルプリセットを Quicklink で呼び出す」を追加
7. `CHANGELOG.md` の `[Unreleased]` → `### Added` に 2 エントリ追記

## Critical Files

- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/lib/deeplink.ts` (新規)
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/link-note.tsx`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/src/quick-note.tsx`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/README.md`
- `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack/CHANGELOG.md`

## 再利用するもの

- `resolveChannelIds(entries, channels)` (`src/lib/channels.ts:95-123`) — 名前/ID 混在受付・unknown silent drop。Quicklink payload も `defaultChannels` も同じ関数で解決
- `useChannels(token)` (`src/lib/useChannels.ts`) — 既存のキャッシュ + revalidate を流用
- `Form.TagPicker` の ID ベース内部値 (`src/link-note.tsx:131` / `src/quick-note.tsx:93`) — `selected` をそのまま deeplink payload に流せる
- `@raycast/api` の `LaunchProps` (`index.d.ts:6143-6173`) と `Action.CreateQuicklink` (`index.d.ts:1861-1880`) — 追加依存なし

## Verification (Raycast dev mode end-to-end)

`npm run dev` を立ち上げ、以下を順に確認:

1. **Lint / Build**: `npm run lint` PASS、`ray build` 通過。`raycast-env.d.ts` に変更が出ない
2. **基本起動 (regression)**: 通常起動 (Quicklink 経由でない) で `defaultChannels` preference の pre-select が現状どおり動く
3. **Action 表示条件**: Form を開いて `selected = []` の状態 → Action Panel に "Save as Quicklink Preset" が出ない。1 つ選ぶと出現
4. **CreateQuicklink 動作**: 2 つチャンネルを選んで `⌘⇧L` → Raycast の Create Quicklink ダイアログが開き、Link 欄に `raycast://extensions/peinan/raycast-linknote-slack/link-note?context=%7B%22channels%22%3A%5B%22C...%22%2C%22C...%22%5D%7D`、Name 欄に `Link Note → #ch1, #ch2` が pre-fill されている
5. **Quicklink 保存後の起動**: 4 で名前を `Test ideas preset` 等にして保存 → Raycast から実行 → Link Note Form が開き、4 で選んだ 2 チャンネルが pre-select されている
6. **ホットキー割当**: Settings → Extensions → Quicklinks → `Test ideas preset` に `⌥1` 割当 → 任意フォアグラウンドアプリから `⌥1` で 1 押し起動 → 同じく pre-select
7. **launchContext > defaultChannels**: `defaultChannels = "general"` 設定下、Quicklink は `["C_ideas"]` のみ → 起動 → `ideas` のみ pre-select (`general` は混ざらない)
8. **launchContext fallback (完全失敗)**: `defaultChannels = "general"` 設定下、Quicklink を **存在しないチャンネル名** (例: `["does-not-exist"]`) で組んで起動 → toast "Unknown channels in preset: does-not-exist"、`general` が pre-select される
9. **launchContext 部分失敗**: `["C_general", "does-not-exist"]` で起動 → toast 出るが pre-select は `general` だけ (= 部分成功時はそれを尊重し default は使わない)
10. **`selected.length === 0` ガード**: Quicklink で `["C_general", "C_ideas"]` 起動 → 手動で `general` を外す → `⌘R` でチャンネル再検証 → 外した `general` が勝手に戻ってこない
11. **Channels loading レース**: Raycast Settings から拡張のキャッシュをクリア → Quicklink 起動 → channels 取得中は Form loading → 取得完了後に pre-select が反映される
12. **Quick Note でも同等動作**: `buildQuicklink("quick-note", ...)` で生成した Quicklink を実行 → Quick Note Form が立ち上がり launchContext の channels が pre-select される (`quickNoteDefaultChannels` ではなく)
13. **送信動作**: pre-select された状態で実際に送信 → Slack に届く
14. **TypeScript 型**: `props.launchContext` が `ChannelPresetContext | undefined` として推論される (`ray build` 内の tsc が PASS)
15. **Template Editor 無関係**: `Edit Message Template` の挙動が変わっていないこと (props を取らない)

## リスク・留意点

1. **不明チャンネル (typo / archived / 別ワークスペースの ID)**: `resolveChannelIds` が silent drop するので、UI 上は単に少なく pre-select される。検証 8/9 で扱う toast 通知で気付ける設計。`channels.length === 0` の loading 中は判定保留
2. **マルチワークスペース**: Quicklink は ID を埋め込むので、Bot Token を別ワークスペースに切り替えると **全 ID が解決失敗** → toast 警告 → `defaultChannels` にフォールバック。挙動は安全だが、README で「Quicklink はワークスペース固有」を明記
3. **launchContext と `defaultChannels` の干渉**: 完全失敗時のみ `defaultChannels` にフォールバック。部分成功時は launchContext のみ尊重 ("Quicklink を踏んだ意図 = 用途を固定したい" を優先)
4. **チャンネル loading レース**: `initialSelectedIds = useMemo(..., [channels])` と `useEffect([initialSelectedIds])` のチェーンで、cold start でも channels 到着後に必ず再評価される
5. **空 selection の Quicklink**: `{selected.length > 0 && ...}` で Action 自体を非表示にする
6. **payload の URL 長**: ID は ~11 文字 × 100 ch でも JSON 整形後 1500 文字程度。Raycast deeplink の実用範囲内
7. **`launchContext` のスキーマが緩い (`[k: string]: any`)**: `Array.isArray` + `typeof === "string"` でガード。悪意モデルでなく型安全のため (任意 JSON が他コマンドから飛んでくる可能性に備えて配列・要素型を必ず検査)
8. **shortcut `⌘⇧L` の衝突**: 現状 `link-note` の ActionPanel は `⌘⇧T` (Edit Template) と `⌘R` (Refresh)、`quick-note` は `⌘R` のみ。`⌘⇧L` は未使用、Raycast Form のシステム標準キーとも衝突しない
9. **Quick Note の comment 必須バリデーション**: `comment.trim() === ""` で送信失敗 (`src/quick-note.tsx:29-34`) は維持。Quicklink で起動しても channels だけ pre-select、comment は空のまま — Issue #11 のスコープ (= channels プリセット) と整合
10. **`buildQuicklink` のテスト**: 純粋関数だが本リポジトリにテストフレームワーク不在のため、検証 4-6 の手動チェックで代替 (Issue #4 / #12 #13 と同方針)
