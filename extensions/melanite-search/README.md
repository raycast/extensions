# Melanite Search

Search a [Melanite](https://melanite.masuipeo.com/) library from Raycast — by file name,
tag name, or memo — and preview thumbnails and metadata without leaving the launcher.

Melanite is a local desktop app that combines tag-based file management with plain-text Markdown
notes. This extension opens the library's `melanite.db` **read-only** and never writes anything
back, neither to the database nor to the files themselves.

## Setup

Point the **Library Folder** preference at your `.melanite` folder (the one holding
`melanite.json` and `melanite.db`). Raycast asks for it the first time you run the command.

You need Melanite itself to create and fill a library; this extension only reads one.

## Preferences

| Preference     | What it does                                                                |
| -------------- | --------------------------------------------------------------------------- |
| Library Folder | The `.melanite` folder to read. `melanite.db` inside it is opened read-only |
| Sort By        | Modified / imported / created date, or name                                 |
| Result Limit   | How many items to show at once (default 100)                                |
| Search Scope   | Whether the item memo is searched too (default on)                          |

To switch between several libraries, duplicate the `Search Files` command in Raycast's command
settings — each copy keeps its own preferences.

## Usage

Open `Search Files` and start typing.

- Words separated by spaces are combined with **AND**. Each word matches the display name, the
  name on disk, a tag name, or the memo
- Prefix a word with `#` to match **tag names only** (for example `#photo cat`)
- The dropdown on the right narrows results by kind: Notes, Images, Videos, Audio, Documents, Other
- Trashed items never show up

### Keyboard shortcuts

| Key                           | Action                                        |
| ----------------------------- | --------------------------------------------- |
| `↵`                           | Open in the default app                       |
| `⌘Y`                          | Quick Look                                    |
| `⌘⇧↵`                         | Open With…                                    |
| `⌘⇧O`                         | Open the item's folder                        |
| `⌘D`                          | Toggle the detail pane (thumbnail + metadata) |
| `⌘T`                          | Filter by one of the item's tags              |
| `⌘⇧C` / `⌘⇧N` / `⌥⌘C` / `⌘⇧T` | Copy path / name / the file itself / tags     |

On Windows, use `Ctrl` and `Alt` in place of `⌘` and `⌥`.

## Thumbnails

Row icons and the detail pane both use `thumbs/<ulid>.webp`. Images without a cached thumbnail are
previewed from the original file, and notes and text files show the `excerpt` stored in the
database (roughly the first 300 characters). Thumbnails are a cache written by Melanite itself, so
items it has not processed yet fall back to a generic kind icon.

## Limitations

- **Search is a SQL `LIKE` substring match.** Melanite's own full-text search (FTS5 trigram) is not
  used, so note **bodies** are not searched — only names, tags, and memos. Case-insensitive
  matching applies to ASCII only, per SQLite's `LIKE`
- Sorting by name uses `COLLATE NOCASE`. Melanite's natural-order collation (`natural_ci`) is
  registered per connection on the Rust side and is not reachable from another process
- If Melanite has the database locked, `useSQL` reads a temporary copy. Changes still sitting in
  the WAL may not be visible yet, so the very latest edits can be missing
- Results cannot be listed directly in Raycast's root search — Raycast only surfaces extension
  commands there, so you open `Search Files` first and narrow from within

---

# 日本語

Melanite ライブラリのアイテムを Raycast から検索する拡張機能。
`melanite.db` を**読み取り専用**で開き、ファイル名・タグ名・メモで絞り込んで、
右ペインにサムネイルとメタデータを表示する。

Melanite 本体には一切書き込まない (DB もファイル実体も読むだけ)。

## セットアップ

設定の **Library Folder** に `.melanite` フォルダ (`melanite.json` と `melanite.db` が入っているフォルダ)
を指定する。初回にコマンドを実行したときに Raycast が尋ねてくる。

ライブラリの作成と取り込みは Melanite 本体で行う。この拡張は読むだけ。

## 設定

| 設定           | 内容                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Library Folder | 読み込む `.melanite` フォルダ。中の `melanite.db` を readonly で開く |
| Sort By        | 並び順 (更新日時 / 追加日時 / 作成日時 / 名前)                       |
| Result Limit   | 一度に表示する最大件数 (既定 100)                                    |
| Search Scope   | メモも検索対象に含めるか (既定 ON)                                   |

複数ライブラリを切り替えたい場合は、Raycast のコマンド設定で
`Search Files` を Duplicate すると設定を別に持てる。

## 使い方

Raycast のルート検索で `Search Files` (または `melanite`) を開き、検索欄に文字を打つ。

- 空白区切りの語は **AND**。各語は「表示名 / 実体のファイル名 / タグ名 / メモ」のいずれかに部分一致すればヒットする
- `#` を先頭に付けると**タグ名だけ**を対象にする (例: `#写真 猫`)
- 検索欄右のドロップダウンで種別 (Notes / Images / Videos / Audio / Documents / Other) を絞れる
- ゴミ箱のアイテムは出てこない

### ショートカット

| キー                          | 動作                                              |
| ----------------------------- | ------------------------------------------------- |
| `↵`                           | 既定のアプリで開く                                |
| `⌘Y`                          | Quick Look                                        |
| `⌘⇧↵`                         | Open With…                                        |
| `⌘⇧O`                         | アイテムのフォルダを開く                          |
| `⌘D`                          | 右ペイン (サムネイル + メタデータ) の表示切り替え |
| `⌘T`                          | このアイテムのタグで絞り込む                      |
| `⌘⇧C` / `⌘⇧N` / `⌥⌘C` / `⌘⇧T` | パス / 名前 / ファイル本体 / タグをコピー         |

Windows では `⌘` を `Ctrl`、`⌥` を `Alt` に読み替える。

## サムネイル

一覧の行アイコンと右ペインの両方で `thumbs/<ulid>.webp` を使う。
サムネイルが無い画像は実体を直接プレビューし、
ノートやテキストは DB の `excerpt` (本文の先頭 ~300 字) を表示する。
サムネイルは Melanite 本体が生成するキャッシュなので、
まだ生成されていないアイテムは種別アイコンになる。

## 制限

- **検索は SQL の `LIKE` による部分一致**。本体の全文検索 (FTS5 trigram) は使っていないので、
  ノート**本文**は検索対象外 (対象は名前・タグ・メモ)。
  大文字小文字の同一視は ASCII のみ (SQLite の `LIKE` の仕様)
- 名前順ソートは `COLLATE NOCASE`。本体の自然順照合 (`natural_ci`) は
  Rust 側で接続ごとに登録するものなので、外部プロセスからは使えない
- Melanite 本体が DB をロックしている場合、`useSQL` は DB をテンポラリにコピーして読む。
  このとき WAL 未チェックポイント分が反映されず、直前の変更が見えないことがある
- Raycast のルート検索そのものにアイテムを並べることはできない
  (Raycast は拡張機能のコマンドしかルートに出さない)。
  `Search Files` を開いてから絞り込む形になる
