# Rake

RaycastからRakeタスクを検索して実行するmacOS向けExtensionです。
ホームディレクトリで実行した `rake -T` の結果を一覧表示し、引数のあるタスクには入力フォームを表示します。

[English](README.md)

## 必要な環境

- macOS版Raycast
- RubyとRake
- ホームディレクトリで `rake -T` を実行して取得できるタスク

タスクの取得と実行では、シェルを起動せずに `rake` を直接呼び出します。
Raycastの実行環境の `PATH` から、使用するRubyとRakeを見つけられる必要があります。
シェルの設定ファイルは読み込まないため、ターミナルとは実行環境が異なる場合があります。

ホームディレクトリでのタスク一覧は、ターミナルで次のコマンドを実行して確認できます。

```sh
cd ~
rake -T
```

## インストール

リポジトリを取得して依存パッケージをインストールし、Extensionをビルドします。

```sh
git clone https://github.com/kdmsnr/raycast_rake.git
cd raycast_rake
npm ci
npm run build
```

1. Raycastで `Import Extension` コマンドを開きます。
2. 取得した `raycast_rake` ディレクトリ（`package.json` があるディレクトリ）を指定します。
3. インポート後、Raycastで「Run Rake Task」コマンドを開きます。

## 使い方

1. Raycastで「Run Rake Task」コマンドを開き、タスクを検索します。
2. 引数のないタスクは、選択してEnterを押すと実行します。
3. 引数のあるタスクは、Enterでフォームを開き、値を入力して「Run Rake Task」で実行します。

実行中の状態と成功または失敗をトーストで表示します。
成功時には標準出力を表示し、標準出力が空なら標準エラー出力、それも空なら `Done` を表示します。
出力が長い場合は末尾だけを保持し、省略したことを表示します。
出力量を理由にタスクを停止することはありません。

タスクを変更したら、一覧の「Reload Tasks」または `⌘R` で再読み込みできます。
一覧が空の場合は、「Run Rake Task」コマンドを開き直してください。

すべてのタスクはホームディレクトリで実行します。
プロジェクトのディレクトリを選択する機能はありません。
引数はタスクの定義順にカンマで連結して渡すため、値にカンマを含む引数には対応していません。
タスクはバックグラウンドで実行し、出力を取得するため、対話的な入力には対応していません。

## 開発

ローカルからのインストールと開発には、Node.js 22.22.2以降とnpmが必要です。
Storeからインストールする場合、Node.jsとnpmを別途用意する必要はありません。

```sh
npm run dev   # 開発モードで起動
npm run build # dist/へビルドして型チェック
npm test      # RaycastやGUIを使わずに解析と子プロセス処理を検証
npm run lint  # 公開情報、アイコン、コード、書式を検証
npm run fix-lint # 自動修正できるlintと書式の問題を修正
```

`npm run build` はRaycastを起動せず、`dist/` に出力します。
コマンドの実装は `src/rake.tsx`、Extensionの定義は `package.json` にあります。

## Storeへの公開

公開前に `author` がRaycastのユーザー名と一致することを確認し、`CHANGELOG.md` とStore用スクリーンショットを用意します。
スクリーンショットは2000 × 1250のPNGで、3枚以上が推奨されています。
RaycastのWindow Captureで「Save to Metadata」を有効にして手動で撮影します。

```sh
CI=true npm run lint
npm run build
```

変更をコミットした後、次のコマンドで公開用PRを作成します。

```sh
npm run publish
```

GitHub認証後、`raycast/extensions` にPRが作成され、レビューを経てマージされるとStoreに掲載されます。
公開先のディレクトリは `package.json` の `name` に基づく `extensions/rake/` です。
手元のディレクトリ名は `raycast_rake` のままでも構いません。

詳細はRaycastの[公開手順](https://developers.raycast.com/basics/publish-an-extension)と[公開準備ガイド](https://developers.raycast.com/basics/prepare-an-extension-for-store)を参照してください。

## ライセンス

[MIT](LICENSE)
