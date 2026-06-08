# Store スクリーンショット撮影手順

## 1. 目的

このドキュメントは、`Local Copy Blocks` を Raycast Store に公開するためのスクリーンショット撮影手順を定義する。

スクリーンショットは、Raycast の `Window Capture` 機能で作成する。手動の画面切り抜き、任意サイズへの加工、背景が異なる画像の混在は行わない。

## 2. 参照する公式情報

撮影前に以下を確認する。

- Raycast Store 準備ドキュメント: https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast 公式壁紙配布ページ: https://www.raycast.com/wallpapers

Raycast の Store 準備ドキュメントでは、Extension のスクリーンショットについて以下が示されている。

- Raycast `1.37.0` 以降では `Window Capture` を使って Extension のスクリーンショットを作成できる
- Extension を development mode で開いた状態で撮影する
- `Window Capture` 実行時に `Save to Metadata` を有効にする
- スクリーンショットは最大 6 枚まで追加できる
- 少なくとも 3 枚を推奨する
- スクリーンショットサイズは `2000 x 1250` pixel
- アスペクト比は `16:10`
- 形式は `PNG`
- Dark mode support は `No`
- 背景はコントラストが良く、Extension の内容が明確に見えるものを使う
- 複数スクリーンショットで異なる背景を使わない
- 機密情報を含めない
- Raycast 以外のアプリケーションを含めない
- 機能説明上の必然性がない限り、light theme と dark theme を混在させない

## 3. 背景画像

Store 用スクリーンショットでは、リポジトリで管理する指定背景画像を使用する。

使用する背景画像は以下とする。

| 項目         | 内容                                                               |
| ------------ | ------------------------------------------------------------------ |
| 保存先       | `docs/assets/autumnal-peach.png`                                   |
| ファイル形式 | `PNG`                                                              |
| 解像度       | `5120 x 2880`                                                      |
| SHA-256      | `7aecad4ec39d5cb928cf7b538203e0c59db09ca0fe38383c628d84d897f2a470` |

この背景を採用する理由は以下である。

- 抽象背景であり、Raycast ウィンドウと本文表示を邪魔しにくい
- 文字主体の Extension である `Local Copy Blocks` の画面内容を見せやすい
- 暖色の背景で、`Local Copy Blocks` アイコン内の濃色 clipboard と区別しやすい
- 複数スクリーンショットで同一背景を使う運用に向いている

## 4. 撮影前の準備

### 4.1 Raycast の Window Capture 設定

Raycast の設定画面で以下を設定する。

1. Raycast Settings を開く
2. `Advanced` を開く
3. `Window Capture` の `Record Hotkey` を設定する
4. `Custom Wallpaper` の `Select File` で `docs/assets/autumnal-peach.png` を指定する
5. `Copy to clipboard` は任意とする
6. `Show in Finder` は任意とする

`Record Hotkey` は利用者環境の既存ショートカットと衝突しないものを設定する。Raycast 公式ドキュメントの例では `Command + Shift + Option + M` が示されている。

### 4.2 Extension の起動

リポジトリルートで以下を実行し、Extension を development mode で開ける状態にする。

```sh
npm run dev
```

`npm run dev` は `ray develop` を実行する。`ready - built extension successfully` が表示されたら、Raycast から対象 Command を開く。

### 4.3 撮影用データ

Store スクリーンショット撮影には、ローカル動作確認用のデモ Block Set を使用する。

デモ Block Set の生成、削除、Raycast Preferences への `Enable Block Set N` と Block Set Folder の設定手順は、[ローカル確認手順の「Raycast 手動動作確認用デモデータ」](local-verification.md#5-raycast-手動動作確認用デモデータ) を正とする。

撮影前に、生成された Markdown ファイルに公開して問題のない内容だけが含まれていることを確認する。

スクリーンショットは Store と GitHub 上で公開されるため、以下を含めない。

- 個人情報
- 認証情報
- API key
- 社内情報
- 顧客情報
- 未公開プロジェクト名
- 実在の業務用本文

## 5. 撮影する画面

初期公開では、少なくとも以下の 3 枚を作成する。

| 番号 | Command          | 画面状態                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 目的                                                                                      |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | `Block Set 1`    | `Block Set 1` が開いている。preview pane が表示されている。Markdown ファイル `blog-outline.md` が選択されている。detail pane には本文プレビューと metadata table が表示されている。metadata table には `Block Set`、`Relative Path`、`Size`、`Updated`、`Full Path` が表示されている。画面下部の primary action は `Copy Raw Content` である。                                                                                                                                                                                                                | 既存 Markdown ファイルを選択して内容を確認できることを示す                                |
| 2    | `Block Set 2`    | Markdown ファイル `all-placeholders.md` が選択され、Action Panel が開いている。Action Panel の選択行は `Copy Expanded Content` である。detail pane には Dynamic Placeholders を含む本文プレビューが表示されている。画面下部の primary action は `Copy Raw Content` である。Action Panel には上から順に `Copy Raw Content`、`Copy Expanded Content`、`Hide Preview`、ファイルを開く Action、`Open with…`、`Show in Finder` が表示されている。ファイルを開く Action は、`Editor` preference が未設定の場合は `Open`、設定済みの場合は `Open in Editor` である。 | Dynamic Placeholders を含む Markdown-backed text block を、展開してコピーできることを示す |
| 3    | `All Block Sets` | `All Block Sets` が開いている。複数 Block Set の section が表示されている。少なくとも `block-set-2` と `block-set-1` の section が表示されている。Markdown ファイル `all-placeholders.md` が選択されている。detail pane には本文プレビューと metadata table が表示されている。画面下部の primary action は `Copy Raw Content` である。                                                                                                                                                                                                                        | 複数 Block Set を横断検索できることを示す                                                 |

追加する場合は最大 6 枚までとし、同じ背景、同じ theme、同じ撮影方法で作成する。

## 6. 撮影手順

1. `npm run dev` を起動する
2. Raycast で撮影対象 Command を開く
3. 撮影対象の Markdown ファイルまたは Action を選択した状態にする
4. `Window Capture` の `Record Hotkey` を押す
5. `Save to Metadata` を有効にする
6. 保存する
7. `metadata` 配下に `PNG` 画像が作成されたことを確認する
8. 画像サイズが `2000 x 1250` pixel であることを確認する
9. 画像内に機密情報や不要な他アプリ表示が含まれていないことを確認する
10. README に掲載する 1 枚目を更新した場合は `npm run sync:readme-media` を実行する

## 7. 撮影後の確認項目

作成したスクリーンショットごとに以下を確認する。

- `metadata` 配下に保存されている
- 形式が `PNG`
- 画像サイズが `2000 x 1250` pixel
- 背景が `docs/assets/autumnal-peach.png` と同一
- Raycast の Extension 画面だけが写っている
- 機密情報が写っていない
- 文字が潰れていない
- List と preview pane の両方が読める
- 複数画像で theme と背景が統一されている
- Action Panel が写る画像では、Action icon の有無が混在していない

確認用コマンド例:

```sh
sips -g pixelWidth -g pixelHeight metadata/*.png
```

README 用画像の同期確認:

```sh
npm run sync:readme-media
```

```sh
sips -g pixelWidth -g pixelHeight media/local-copy-blocks-1.png
```

## 8. このリポジトリで管理するもの

このリポジトリでは以下を管理する。

- `docs/assets/autumnal-peach.png`
- `media/local-copy-blocks-1.png`
- `docs/store-screenshots.md`
- Raycast `Window Capture` により作成された `metadata/*.png`

管理フォルダの役割は以下とする。

| フォルダ       | 役割                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| `assets/`      | Extension 実行時に参照する icon などの runtime asset                                 |
| `metadata/`    | Raycast `Window Capture` が `Save to Metadata` で作成する Store 用スクリーンショット |
| `media/`       | README から直接参照する画像                                                          |
| `docs/assets/` | ドキュメントや撮影手順の補助資産                                                     |

`docs/assets/autumnal-peach.png` は撮影背景の再現用ファイルであり、Store に表示するスクリーンショットそのものではない。

Store に表示するスクリーンショットは、Raycast `Window Capture` が `Save to Metadata` で作成する `metadata/*.png` とする。

README に表示するスクリーンショットは `media/local-copy-blocks-1.png` とする。これは `metadata/local-copy-blocks-1.png` を元に `npm run sync:readme-media` で同期する。

## 9. Raycast Pull Request の Screencast

Raycast publish 後に作成される `raycast/extensions` の Pull Request には、Screencast 欄がある。

Screencast 欄は reviewer が画面内容を確認するための Pull Request 上の説明であり、Raycast Store に表示される Store 用 screenshot の保存場所ではない。

Store に表示する screenshot は `metadata/*.png` とする。

Screencast 欄には、`metadata/*.png` のうち reviewer に見せたい画像を貼る。

README に表示する画像は `media/local-copy-blocks-1.png` とする。README 用画像を更新する場合は、`metadata/local-copy-blocks-1.png` を撮影後に `npm run sync:readme-media` を実行する。

画像の役割は以下とする。

| 画像                            | 役割                                |
| ------------------------------- | ----------------------------------- |
| `metadata/*.png`                | Raycast Store 用 screenshot         |
| Pull Request の Screencast 欄   | reviewer 確認用の Pull Request 説明 |
| `media/local-copy-blocks-1.png` | README に表示する画像               |
