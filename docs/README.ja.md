# Quick Share

ブラウザのアクティブタブ（URL + タイトル）に任意のコメントを添えて、事前に登録した複数の Slack チャンネルへ一発送信する Raycast 拡張

## 使い方

1. ブラウザで共有したいタブを開いた状態で
2. Raycast から **Share Active Browser Tab to Slack** を起動
3. URL とタイトルが自動取得される（タイトルは送信前に編集可能）
4. コメント欄に任意で一言（不要ならスキップ）
5. チャンネル候補から複数選択
6. **Send to Slack** で送信。成功すれば Raycast が閉じる、失敗チャンネルがあればトーストに理由が表示される

URL なしで素早くメモだけ投げたい場合は **Send Quick Note to Slack** を使う。タブ取得をスキップして Comment と Channels だけのフォームを開き、独立した既定チャンネル（`Quick Note Default Channels`）を持つ。

送信メッセージのフォーマットは拡張機能内の Sub-form (`Edit Message Template`, <kbd>⌘⇧T</kbd>) でカスタマイズ可能。詳細は [メッセージテンプレートを編集する](#メッセージテンプレートを編集する) を参照。実装は [`src/lib/slack.ts`](./src/lib/slack.ts) の `buildSlackText`。Slack 側でリンクプレビュー（unfurl）が効くので、コメントなしでもタイトル・サムネイルが展開される。

## 必要なもの

- macOS + Raycast
- Arc / Google Chrome / Brave / Microsoft Edge / Safari のいずれか
- Slack ワークスペース（Bot を入れられる権限）

## セットアップ

### 1. Slack App を作って Bot Token を取得

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** で以下を貼ると最速:

```yaml
display_information:
  name: Quick Share
features:
  bot_user:
    display_name: Quick Share
oauth_config:
  scopes:
    bot:
      - chat:write
      - chat:write.public
      - channels:read
      - groups:read
```

| スコープ | 用途 |
|---|---|
| `chat:write` | メッセージ投稿（必須） |
| `chat:write.public` | パブリックチャンネルに Bot 招待なしで投稿可（推奨） |
| `channels:read` | チャンネル一覧の動的取得（必須） |
| `groups:read` | プライベートチャンネルも候補に含める（推奨） |

作成後 **Install to Workspace** で承認 → **OAuth & Permissions** ページの **Bot User OAuth Token**（`xoxb-...`）をコピー。

> プライベートチャンネルに送る場合は、各チャンネルで `/invite @quickshare` の招待が別途必要。

### 2. Raycast 拡張に Preferences を設定

Raycast で **Share Active Browser Tab to Slack** を初回起動すると入力画面が出る:

| 項目 | 例 | 説明 |
|---|---|---|
| **Slack Bot Token** | `xoxb-...` | 上で取得したトークン |
| **Default Channels** | `times-yourname` | Share Active Browser Tab 起動時に既選択にしたいチャンネル名 or ID（カンマ区切り、任意） |
| **Quick Note Default Channels** | `idea` | Quick Note 起動時に既選択にしたいチャンネル名 or ID（カンマ区切り、任意） |

これだけで使える。ブラウザ側の設定は不要。

### 3. チャンネルプリセットを Quicklink で呼び出す

用途別 (例: `general` + `ideas` の "アイデア共有プリセット") に送信先を瞬時に切り替えたい場合、
Raycast の Quicklink を使うと 1 押しで該当プリセット入りの Form を開ける。

1. **Share Active Browser Tab to Slack** (または **Send Quick Note to Slack**) を起動し、Channels で目的のチャンネル群を選択する
2. Action Panel から **Save as Quicklink Preset** (<kbd>⌘⇧L</kbd>) を選ぶ
3. Raycast 標準の Create Quicklink ダイアログが開く (Link / Name は pre-fill 済み)。Name を分かりやすく書き換えて保存
4. **Raycast Settings → Extensions → Quicklinks** で当該 Quicklink を選び、**Hotkey** または **Alias** を割り当てれば 1 押し / 1 タイプで起動できる

Quicklink の URL に埋め込まれているのはチャンネル ID (`C0123ABCD`) なので、Slack 側でチャンネル名を変更しても Quicklink は壊れない。一方、別ワークスペースに Bot Token を切り替えると ID が一致しないため Quicklink は再生成が必要。

#### チャンネル候補について

- チャンネル候補は Slack から動的に取得される（`conversations.list` 経由、ローカルキャッシュ + バックグラウンド再検証）
- フォーム表示中は <kbd>⌘R</kbd> で手動リフレッシュ可能
- プライベートチャンネルを候補に含めるには Slack App に `groups:read` を追加（未付与だとピッカーに出ない）
- `Default Channels` / `Quick Note Default Channels` は名前でも ID（`C0123ABCD` 形式）でも指定可。リネーム耐性を求めるなら ID 推奨

### メッセージテンプレートを編集する

送信メッセージのフォーマットは拡張機能内の Sub-form でカスタマイズできる。

1. **Share Active Browser Tab to Slack** を起動
2. Action Panel から **Edit Message Template**（ショートカット <kbd>⌘⇧T</kbd>）を選ぶ
3. 複数行の `Form.TextArea` が開き、その直下に Placeholders ガイド（`Form.Description`）が表示される

または **Edit Message Template** はトップレベルコマンドとしても登録されているので、Raycast ランチャーから直接起動したり、`Raycast Settings → Extensions → Quick Share` でグローバルホットキー / エイリアスを割り当てたりできる。

利用可能なプレースホルダ:

| プレースホルダ | 内容 |
|---|---|
| `{title}` | ページタイトル（mrkdwn エスケープ済み） |
| `{url}` | 生 URL |
| `{comment}` | 入力したコメント（mrkdwn エスケープ済み） |
| `{link}` | `<url\|title>` 形式の Slack 短縮リンク |

コメントが空のとき、`{comment}` のみを含む行は自動で除去される。

テンプレートはデバイスの LocalStorage に保存され、Raycast を再起動しても保持される。Sub-form 内の **Reset to Default** アクションでいつでも既定値に戻せる。

既定のテンプレート:

```
{comment}
{link}
```

（= コメントを 1 行目、その下に Slack 短縮リンク）

## タブ URL の取得経路

優先度順に 2 経路。1 が使えなければ 2 にフォールバックする。

1. **Raycast Browser Extension**（任意）  
   Chrome / Arc / Brave / Edge にインストールしておくと、より安定して全ウィンドウ・全タブに対応。[raycast.com/browser-extension](https://www.raycast.com/browser-extension) からインストール
2. **AppleScript**（既定）  
   何もインストールしなくても Arc / Chrome / Brave / Edge / Safari の最前面ウィンドウのアクティブタブから取得する。**この経路だけで通常は十分**。初回のみ macOS の Automation 権限ダイアログで「許可」が必要

将来「ページ本文を引用して送る」「全タブから選んで送る」などの機能が欲しくなったら Browser Extension の導入を検討する、で OK。

## トラブルシュート

### `Could not connect to the Browser Extension.`

Browser Extension API は呼べるが、ブラウザ側拡張が未インストールまたは未接続。**そのまま AppleScript フォールバックに流れて動く**ので無視して良い。完全に消したい場合はブラウザ側に Raycast Browser Extension を入れる。

### `not_in_channel` エラー

Bot が招待されていないチャンネルに送ろうとした。対象チャンネルで `/invite @quickshare`。パブリックチャンネルなら `chat:write.public` スコープを足して App を Reinstall すれば招待不要になる。

### `channel_not_found` エラー

Channels の値にタイポがある、またはリネーム後の旧名を指定している。Slack 側で確認するか、リネームに強い **チャンネル ID**（`C` で始まる文字列）を Preferences に入れる。

### `invalid_auth` / `not_authed` エラー

トークンが間違っている、または Bot Token Scopes 変更後に再インストールしてトークンが切り替わっている。**OAuth & Permissions** ページの最新の `xoxb-...` を貼り直す。

### `missing_scope` エラー

`chat:write` が付いていない。スコープ追加 → **Reinstall to Workspace** が必要（ボタンはページ上部に黄色いバナーで出る）。

### `(node:xxxxx) [DEP0040] DeprecationWarning: The 'punycode' module is deprecated.`

Node 自体の警告で、Raycast の依存ツリー内のライブラリが旧 `punycode` を参照しているだけ。動作に影響なし、無視して OK。
