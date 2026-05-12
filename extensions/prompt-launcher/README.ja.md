# Prompt Launcher

`Prompt Launcher` は、ローカルフォルダ内の Markdown ファイルとして管理しているプロンプトを Raycast から検索し、コピーまたはエディタで開くための Extension です。

既存の Markdown ファイルをそのまま利用します。プロンプトを Raycast 独自の形式へ移行したり、Raycast 内で新しく管理し直したりする必要はありません。

## この Extension が解決すること

プロンプトを Markdown ファイルとして管理している場合、編集や履歴管理は既存のエディタと Git で十分に行えます。一方で、実際に使う場面では、目的の Markdown ファイルを探して本文をコピーするまでに手間がかかります。

`Prompt Launcher` は、この「呼び出し」の部分だけを Raycast から素早く行えるようにします。

- Markdown ファイルをプロンプト単位で管理している
- プロンプトの編集は Visual Studio Code など普段のエディタで行いたい
- プロンプトの履歴は Git で管理したい
- Raycast では、既存の Markdown プロンプトを素早く探してコピーしたい

## 主な機能

- 指定したフォルダ配下の Markdown ファイルを再帰的に一覧表示。拡張子 `.md` は大文字小文字を区別しない
- 3 つの Prompt Set を個別 Command として起動
- 有効かつ設定済みのすべての Prompt Set を横断検索
- 選択した Markdown ファイルの本文をそのままクリップボードへコピー
- 選択した Markdown ファイルの本文内にある Dynamic Placeholders を置換してクリップボードへコピー
- 選択中ファイルの冒頭プレビューを表示
- 設定済みエディタ、既定アプリ、任意の対応アプリ、Finder でファイルを開く
- 更新日時、ファイル名、相対パスで一覧を並び替え

![Prompt Launcher の Prompt Set 一覧、Markdown プレビュー、コピー Action](media/prompt-launcher-1.png)

## 事前に用意するもの

少なくとも 1 つの Markdown ファイル用フォルダを用意してください。

1 つの Markdown ファイルを 1 つのプロンプトとして扱います。frontmatter、特定のコードブロック、独自の区切り記法は不要です。

例:

```text
prompts/
├── review.md
├── refactor.md
└── writing/
    └── blog-outline.md
```

`Copy Raw Content` を実行すると、選択した Markdown ファイルの本文全体をコピーします。

## 初期設定

インストール後、Raycast Preferences の `Extensions` から `Prompt Launcher` を開き、`Prompt Set 1 Folder`、`Prompt Set 2 Folder`、`Prompt Set 3 Folder` のうち少なくとも 1 つを設定してください。

無効または未設定の Prompt Set を開いた場合に表示される `Open Extension Preferences` からも、同じ設定画面を開けます。

3 つの Prompt Set Folder をすべて設定する必要はありません。Markdown ファイルを表示するには、少なくとも 1 つの有効な Prompt Set に Prompt Set Folder が必要です。

Raycast Preferences では、各 Prompt Set が個別の区切りとして表示されます。`Enable Prompt Set N` の checkbox で、その Prompt Set を個別 Command と `All Prompt Sets` の対象に含めるかどうかを切り替えます。

```text
Prompt Launcher Preferences
├── Prompt Set 1
│   ├── Enable Prompt Set 1
│   ├── Prompt Set 1 Folder
│   └── Prompt Set 1 Name
├── Prompt Set 2
│   ├── Enable Prompt Set 2
│   ├── Prompt Set 2 Folder
│   └── Prompt Set 2 Name
├── Prompt Set 3
│   ├── Enable Prompt Set 3
│   ├── Prompt Set 3 Folder
│   └── Prompt Set 3 Name
└── Shared Preferences
    ├── Editor
    ├── Preview Line Count
    └── Preview Max Characters
```

| Prompt Set 区切り | 設定項目            | 必要性                          | 説明                                                              |
| ----------------- | ------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Prompt Set 1      | Enable Prompt Set 1 | 任意。初期値は有効              | `Prompt Set 1` を個別 Command と `All Prompt Sets` の対象に含める |
| Prompt Set 1      | Prompt Set 1 Folder | `Prompt Set 1` を使う場合に必要 | `Prompt Set 1` が読み取る Markdown フォルダ                       |
| Prompt Set 1      | Prompt Set 1 Name   | 任意                            | Raycast 上に表示する Prompt Set 名                                |
| Prompt Set 2      | Enable Prompt Set 2 | 任意。初期値は有効              | `Prompt Set 2` を個別 Command と `All Prompt Sets` の対象に含める |
| Prompt Set 2      | Prompt Set 2 Folder | `Prompt Set 2` を使う場合に必要 | `Prompt Set 2` が読み取る Markdown フォルダ                       |
| Prompt Set 2      | Prompt Set 2 Name   | 任意                            | Raycast 上に表示する Prompt Set 名                                |
| Prompt Set 3      | Enable Prompt Set 3 | 任意。初期値は有効              | `Prompt Set 3` を個別 Command と `All Prompt Sets` の対象に含める |
| Prompt Set 3      | Prompt Set 3 Folder | `Prompt Set 3` を使う場合に必要 | `Prompt Set 3` が読み取る Markdown フォルダ                       |
| Prompt Set 3      | Prompt Set 3 Name   | 任意                            | Raycast 上に表示する Prompt Set 名                                |

以下の設定は、すべての Prompt Set に共通で適用されます。

| 設定項目               | 必要性 | 説明                                                                                          |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Editor                 | 任意   | `Open in Editor` で Markdown ファイルを開くエディタ。未設定の場合は `Open` で既定アプリを使用 |
| Preview Line Count     | 任意   | プレビューに表示する冒頭行数。初期値は `10`                                                   |
| Preview Max Characters | 任意   | プレビューに表示する最大文字数。初期値は `4000`                                               |

`Enable Prompt Set N` を無効にすると、その Prompt Set は個別 Command と `All Prompt Sets` の対象から外れます。再び有効にすると、設定済みの Prompt Set Folder を参照します。

有効な Prompt Set に Prompt Set Folder を設定していない場合は、設定を促す画面を表示します。

Prompt Set Name が未設定の場合は、設定したフォルダ名を表示名として使用します。

## 最初の使い方

1. Raycast Preferences の `Extensions` から `Prompt Launcher` を開く
2. `Prompt Set 1 Folder` に Markdown プロンプト用フォルダを設定する
3. `Enable Prompt Set 1` を有効のままにする
4. 必要に応じて `Prompt Set 1 Name` を設定する
5. Raycast で `Prompt Set 1` を開く
6. 一覧から Markdown ファイルを選択する
7. Enter を押して `Copy Raw Content` を実行する

有効化している複数フォルダから探したい場合は、`All Prompt Sets` を開いて検索してください。

## Commands

| Command         | 説明                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| Prompt Set 1    | `Prompt Set 1 Folder` に設定したフォルダの Markdown プロンプトを表示     |
| Prompt Set 2    | `Prompt Set 2 Folder` に設定したフォルダの Markdown プロンプトを表示     |
| Prompt Set 3    | `Prompt Set 3 Folder` に設定したフォルダの Markdown プロンプトを表示     |
| All Prompt Sets | 有効かつ設定済みのすべての Prompt Set から Markdown プロンプトを横断検索 |

Raycast の hotkey は Command ごとに設定できます。よく使う Prompt Set には個別 hotkey を設定し、場所が曖昧な場合は `All Prompt Sets` で検索する使い方を想定しています。

## Actions

Markdown ファイルを選択した状態で、以下の Action を利用できます。

| Action                      | 説明                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Copy Raw Content            | Markdown ファイルの本文全体をそのままクリップボードへコピー                                                 |
| Copy Expanded Content       | Markdown ファイルの本文全体にある対応表に記載した Dynamic Placeholders を置換してからクリップボードへコピー |
| Show Preview / Hide Preview | プレビュー表示を切り替え                                                                                    |
| Open in Editor              | `Editor` が設定済みの場合に表示。設定済みエディタで Markdown ファイルを開く                                 |
| Open                        | `Editor` が未設定の場合に表示。既定アプリで Markdown ファイルを開く                                         |
| Open with…                  | 任意の対応アプリで Markdown ファイルを開く                                                                  |
| Show in Finder              | Finder で Markdown ファイルを表示                                                                           |

`Copy Raw Content` が既定の Action です。Enter を押すと、選択中の Markdown ファイル本文をそのままコピーします。

`Open in Editor` と `Open` は同時には表示されません。Extension Preferences の `Editor` が設定済みの場合は `Open in Editor` を表示し、未設定の場合は `Open` を表示します。

## Copy Raw Content と Copy Expanded Content

`Copy Raw Content` は、Markdown ファイルの本文を変更せずにそのままコピーします。

`Copy Expanded Content` は、Markdown ファイルの本文内に対応表に記載した Dynamic Placeholders がある場合だけ、それらを置換してからコピーします。元の Markdown ファイルは変更しません。

Prompt Launcher は、Raycast Dynamic Placeholders と同じ名前の placeholder の一部と、Prompt Launcher 独自の `{timezone}` および `{now}` をサポートしています。Raycast Dynamic Placeholders の完全互換ではなく、置換後の値は Prompt Launcher 内の実装で生成します。

参照: [Raycast Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)

例:

```markdown
Date and time: {datetime}
Time zone: {timezone}
Now: {now}

Clipboard:
{clipboard}
```

`Copy Expanded Content` を実行すると、`{datetime}` は実行環境の現在日時、`{timezone}` は実行環境の time zone、`{now}` は現在日時と time zone を合わせた値、`{clipboard}` は現在のクリップボード文字列に置き換わります。

Dynamic Placeholders を使っていない Markdown ファイルでは、`Copy Raw Content` と `Copy Expanded Content` のコピー結果は実質的に同じです。

## Dynamic Placeholders

`Copy Expanded Content` で置換できる Dynamic Placeholders は、次の表に記載したものだけです。

| Placeholder   | 置換内容                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `{date}`      | 実行環境の locale に基づく現在日付                                                                                            |
| `{time}`      | 実行環境の locale に基づく現在時刻                                                                                            |
| `{datetime}`  | 実行環境の locale に基づく現在日時                                                                                            |
| `{day}`       | 実行環境の locale に基づく曜日                                                                                                |
| `{timezone}`  | Prompt Launcher 追加 placeholder。`Asia/Tokyo UTC+09:00` 形式の time zone                                                     |
| `{now}`       | `{datetime}` と `{timezone}` を空白で連結した現在日時。AI への指示で現在時点を明示するための Prompt Launcher 追加 placeholder |
| `{uuid}`      | ランダムな UUID                                                                                                               |
| `{clipboard}` | 現在のクリップボード文字列                                                                                                    |

この表にない placeholder は置換されず、そのままコピー結果に残ります。

## Preview

初回起動時は、プレビュー表示が有効です。

プレビュー表示中は、選択中ファイルの冒頭を Raycast の detail pane に表示します。プレビュー本文は一覧作成時には読み込まず、選択中のファイルだけを必要になった時点で読み込みます。

`Show Preview` / `Hide Preview` で表示状態を切り替えると、その状態は Raycast の LocalStorage に保存されます。次回以降は、最後に選択した表示状態を復元します。

## Sort

検索バー右側の `Sort` dropdown から表示順を切り替えられます。

| Sort                   | 説明                                   |
| ---------------------- | -------------------------------------- |
| Updated (Newest First) | 更新日時が新しい順。初期値             |
| Updated (Oldest First) | 更新日時が古い順                       |
| Name (A-Z)             | ファイル名の昇順                       |
| Path (A-Z)             | Prompt Set Folder からの相対パスの昇順 |

## Markdown ファイルの扱い

有効かつ設定済みの対象フォルダ配下で、拡張子が `.md` の Markdown ファイルを大文字小文字を区別せずに再帰的に読み取ります。対象例は `.md`、`.MD`、`.Md`、`.mD` です。

以下は一覧対象から除外します。

- `.git` 配下
- `node_modules` 配下
- 隠しディレクトリ配下
- 拡張子が `.md` ではないファイル。大文字小文字は区別しません

シンボリックリンクは辿りません。

## よくある問題

### Prompt Set を開くと設定画面を案内される

その Prompt Set が無効になっている、または対応する Prompt Set Folder が未設定です。Raycast の Extension Preferences を開き、必要に応じて対象の Prompt Set を有効にし、Prompt Set Folder を設定してください。

### Markdown ファイルが表示されない

以下を確認してください。

- Prompt Set Folder が正しいフォルダを指している
- 対象ファイルの拡張子が `.md` である。大文字小文字は区別しません
- 対象ファイルが `.git`、`node_modules`、隠しディレクトリ配下にない
- 対象フォルダが存在し、Raycast から読み取れる

### フォルダを設定しているのに読み込みに失敗する

設定した path がフォルダではない、フォルダが削除または移動された、または Raycast から対象フォルダへアクセスできない可能性があります。Extension Preferences で Prompt Set Folder を設定し直してください。

### `Open in Editor` が期待したアプリで開かない

Extension Preferences の `Editor` を確認してください。`Editor` が未設定の場合、Action は `Open in Editor` ではなく `Open` と表示され、Markdown ファイルの既定アプリで開きます。

### `Copy Expanded Content` の結果が期待と違う

置換されるのは、Dynamic Placeholders の対応表に記載した placeholder だけです。表にない placeholder は置換されず、そのままコピー結果に残ります。

`{clipboard}` を使う場合は、実行時点のクリップボード文字列がコピー結果に挿入されます。

## プライバシーとデータの扱い

`Prompt Launcher` は、利用者が有効化して設定した Prompt Set Folder 配下の Markdown ファイルを読み取ります。

Markdown ファイルの本文は、利用者がコピー操作を実行した場合のみクリップボードへ渡されます。

`Copy Expanded Content` で、Markdown ファイル本文内に `{clipboard}` が含まれる場合のみ、現在のクリップボード文字列を読み取ります。

プレビュー表示の状態は Raycast の LocalStorage に保存します。

この Extension はネットワーク通信を行いません。

## ファイルの安全性

`Prompt Launcher` は Markdown ファイルを新規作成、編集、リネーム、移動、削除しません。Git 操作やクラウド同期も行いません。

## 開発者向け参照

この README は、Raycast Store で利用者が Extension の概要、初期設定、使い方、データの扱いを確認するための文書です。

ローカル開発、デモデータ、公開前確認、GitHub Release、Raycast Store publish、Store スクリーンショット撮影の手順は、以下の開発者向け文書へ分離しています。

- [ローカル確認手順](docs/local-verification.md)
- [リリース管理手順](docs/release-management.md)
- [Store スクリーンショット撮影手順](docs/store-screenshots.md)
