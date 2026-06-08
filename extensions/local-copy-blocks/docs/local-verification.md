# ローカル確認手順

## 1. 目的

この文書は、`Local Copy Blocks` をローカルで開発、修正、確認するための手順を定義する。

ローカル確認では、実装修正、静的確認、Raycast 上での手動動作確認、公開前の build 確認までを扱う。

リリースタグ作成、GitHub Release 作成、Raycast Store への公開実行は GitHub Actions で扱う。

GitHub Actions の `Build` workflow は、リモート repository に branch が push された時点、Pull Request の作成または更新時、GitHub Actions 画面からの手動実行時に `npm run build`、`npm run check`、`npm run lint` を実行する。

## 2. 実行場所

以下のコマンドは、リポジトリルートで実行する。

依存関係を準備する場合は、`package-lock.json` に基づいて次を実行する。

```bash
npm ci
```

`npm ci` の実行タイミングは、初回セットアップ、`package-lock.json` 変更後、依存関係を入れ直す場合である。

## 3. ローカル用 npm scripts

`package.json` の scripts は、用途ごとに以下のように分ける。

| Script                        | 実体                                                              | 用途                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run check`               | `npm run check:type && npm run lint:local && npm run check:local` | `raycast-env.d.ts` 生成後に実行する一括確認                                                                   |
| `npm run check:type`          | `tsc -p tsconfig.json --noEmit`                                   | TypeScript 型検査                                                                                             |
| `npm run check:lint`          | `eslint src/**`                                                   | Raycast CLI を使わない source lint                                                                            |
| `npm run check:format`        | `node scripts/format.mjs --check`                                 | 明示対象ファイルの整形差分確認                                                                                |
| `npm run check:local`         | `node scripts/local-verification.mjs`                             | Raycast アプリに依存しない単体確認                                                                            |
| `npm run update:dependencies` | `node scripts/update-dependencies.mjs`                            | 依存 package と Raycast API を一括更新                                                                        |
| `npm run lint:local`          | `npm run check:lint && npm run check:format`                      | author 検証を行わないローカル開発用 lint                                                                      |
| `npm run lint`                | `ray lint`                                                        | GitHub Actions の `Build` で実行する公開前 lint。`Release` は `Build` を呼び出す                              |
| `npm run demo:setup`          | `node scripts/demo-block-sets.mjs setup`                          | Raycast 手動動作確認用 Block Set を生成                                                                       |
| `npm run demo:clean`          | `node scripts/demo-block-sets.mjs clean`                          | Raycast 手動動作確認用 Block Set を削除                                                                       |
| `npm run icon:generate`       | `node scripts/generate-icon.mjs`                                  | 確認用アイコンを `assets/icon.generated.png` に生成し、確認後または `--yes` 指定時に `assets/icon.png` へ反映 |
| `npm run fix-lint`            | `eslint src/** --fix && npm run format`                           | author 検証を行わないローカル開発用 lint 自動修正と Prettier 整形                                             |
| `npm run dev`                 | `ray develop`                                                     | Raycast development mode で起動                                                                               |
| `npm run build`               | `ray build -e dist`                                               | distribution build の確認                                                                                     |
| `npm run migrate`             | `npx --yes @raycast/migration@latest .`                           | `@raycast/api` 更新時の移行                                                                                   |
| `npm run format`              | `node scripts/format.mjs --write`                                 | 明示対象ファイルの Prettier 整形                                                                              |

## 4. 通常のローカル実行順

修正後は、必要な生成型を作成してから静的確認を通し、その後に Raycast 上で手動確認する。

`raycast-env.d.ts` が未生成の fresh checkout 直後は、先に `npm run build` を実行する。`raycast-env.d.ts` は Raycast CLI が `package.json` の manifest から生成する TypeScript 定義であり、`npm run check:type` が参照する。

```bash
npm run build
```

```bash
npm run check
```

```bash
npm run dev
```

`npm run check` は `npm run lint:local` を含む。`raycast-env.d.ts` 生成後は `npm run check` を実行すれば、TypeScript、ESLint、Prettier、Raycast アプリに依存しない単体確認まで実行される。

`npm run lint:local` は `ESLint` と `Prettier` を直接実行する。`package.json` の `author` を Raycast account username として検証しない。

Prettier は除外リストではなく、`package.json` の script で以下の管理対象ファイルを明示指定する。

```text
src/**/*.{ts,tsx}
scripts/*.mjs
README.md
README.ja.md
CHANGELOG.md
docs/**/*.md
package.json
tsconfig.json
eslint.config.js
.prettierrc
.github/dependabot.yml
.github/workflows/*.yml
.github/release-manifest.json
.github/release-changelog/*.md
```

Prettier は、上記の明示対象ファイルを整形確認の対象とする。

公開用アイコンを生成する場合は次を実行する。

```bash
npm run icon:generate
```

`npm run icon:generate` は、確認用の `assets/icon.generated.png` を生成し、生成後に `assets/icon.png` へ反映するか確認する。

`yes` と入力すると `assets/icon.generated.png` を `assets/icon.png` へ反映し、反映後に `assets/icon.generated.png` を削除する。`yes` 以外を入力すると、確認用の `assets/icon.generated.png` を残す。

非対話環境で `assets/icon.png` へ反映する場合は次を実行する。

```bash
npm run icon:generate -- --yes
```

非対話環境で確認用の `assets/icon.generated.png` を生成して残す場合は次を実行する。

```bash
npm run icon:generate -- --no
```

`node` で直接実行する場合は、`node scripts/generate-icon.mjs --yes` または `node scripts/generate-icon.mjs --no` を使う。

生成された `assets/icon.generated.png` は、`docs/specification.md` のアイコンセット定義に照らして確認する。

Raycast 公開 Extension としての icon criteria は、GitHub Actions の `Build` workflow で実行する `npm run lint`、つまり `ray lint` で確認する。

`npm run dev` は `ray develop` を実行する。Raycast アプリ上で Command を開き、一覧表示、コピー、Dynamic Placeholders、プレビュー、エディタ起動を人間が操作して確認する。

`npm run dev` は Raycast development mode として Extension を Raycast に import する。Raycast アプリがインストールされ、Raycast に Extension を import できる環境で実行する。

## 5. Raycast 手動動作確認用デモデータ

Raycast 上で手動動作確認するための Block Set Folder は、次のコマンドで生成する。

```bash
npm run demo:setup
```

生成先は以下である。

```text
demo/block-sets/
```

`demo/block-sets/` 内の Markdown ファイルは、拡張子 `.md` の大文字小文字を区別せずに扱う。

`demo/block-sets/` は Raycast development mode で指定する Block Set Folder である。

生成後、Raycast の Extension Preferences で以下を設定する。

```text
Enable Block Set 1:
on

Block Set 1 Folder:
demo/block-sets/block-set-1

Enable Block Set 2:
on

Block Set 2 Folder:
demo/block-sets/block-set-2

Enable Block Set 3:
on

Block Set 3 Folder:
demo/block-sets/block-set-3
```

その後、次を実行して Raycast 上で確認する。

```bash
npm run dev
```

デモデータを削除する場合は、次を実行する。

```bash
npm run demo:clean
```

デモデータには、以下の確認対象を含める。

- 通常の `.md` ファイル
- ネストされた大文字拡張子 `.MD` の Markdown ファイル
- Dynamic Placeholders を含む `.md` ファイル
- 対応表に記載した全種類の Dynamic Placeholders と複数の `{uuid}` を含む `.md` ファイル
- 拡張子が `.md` ではないファイル
- `.git` 配下の `.md` ファイル
- `node_modules` 配下の `.md` ファイル
- 隠しディレクトリ配下の `.md` ファイル

これにより、一覧表示、横断検索、除外対象、`Copy Raw Content`、`Copy Expanded Content`、対応表に記載した全種類の Dynamic Placeholders の展開を Raycast 上で確認できる。

## 6. 公開前のローカル確認順

公開前に近い状態で確認する場合は、次の順に実行する。

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run check
```

公開前に近い状態のローカル確認では、`npm run build` と `npm run check` を実行する。Raycast 公開 Extension としての package manifest、icon、metadata、author の確認は、GitHub Actions の `Build` workflow が `npm run lint` で実行する。`Release` workflow は `Build` workflow を呼び出す。

`npm run build` は `ray build -e dist` を実行する。Raycast 公式 CLI の説明では、`ray build` は配布用の optimized production build を作成し、`ray build -e dist` は Extension が正しく build できるかの検証に使える。

`npm run build` は、Raycast CLI がローカル拡張出力先へ書き込む可能性がある。具体例として、macOS では `~/.config/raycast/extensions/local-copy-blocks` 配下が作成または更新される可能性がある。

`npm run build` は `raycast-env.d.ts` も生成する。生成された `raycast-env.d.ts` を TypeScript 型検査で参照するため、GitHub Actions の `Build` workflow でも `npm run check` より先に `npm run build` を実行する。

`npm run build` 実行後は、Raycast 上で公開前に近い状態の動作を人間が確認する。

## 7. 依存 package と Raycast API の更新

Raycast Store 公開準備では、最新の Raycast API を使っていることを確認する。

依存 package と GitHub Actions の更新検知は `.github/dependabot.yml` で管理する。

Dependabot は以下を対象に、毎週月曜日 `09:00`、`Asia/Tokyo` で更新候補を確認する。

| package ecosystem | directory | 対象                                                         |
| ----------------- | --------- | ------------------------------------------------------------ |
| `github-actions`  | `/`       | `.github/workflows/` で利用する GitHub Actions               |
| `npm`             | `/`       | `package.json` と `package-lock.json` で管理する npm package |

Dependabot が作成する Pull Request は、更新候補の通知として扱う。自動 merge、自動 publish、自動 release は行わない。

Dependabot の Pull Request を反映する場合は、人間がローカルで変更箇所を確認してから判断する。

利用している依存 package は個別に更新せず、一括で更新する。

```bash
npm run update:dependencies
```

`npm run update:dependencies` は以下を順に実行する。

1. `dependencies` にあるすべての package を `@latest` で更新する
2. `devDependencies` にあるすべての package を `@latest` で更新する
3. `npm run migrate` を実行する
4. `npm run check` を実行する

この script は `package.json` と `package-lock.json` を更新する。

`@raycast/api` を更新した場合、または Raycast の migration が必要な場合は、script 内で次を実行する。

```bash
npm run migrate
```

`npm run migrate` は Raycast migration tool を直接実行する。通常確認のたびに単独実行せず、API 更新または migration が必要な場合だけ実行する。

`npm run update:dependencies` 実行後、Raycast アプリで確認する場合は次を実行する。

```bash
npm run dev
```

公開前に近い状態で確認する場合は、次も実行する。

```bash
npm run build
```

## 8. Raycast アプリを使わない範囲の確認

Raycast アプリ上の画面操作を除く確認では、次を実行する。

```bash
npm run check
```

この確認では、TypeScript 型検査、ESLint、Prettier 確認、Raycast に依存しない単体確認を行う。

## 9. `check:local` の確認内容

`npm run check:local` は、リポジトリ管理対象の `scripts/local-verification.mjs` を実行する。

この単体確認では、以下を確認する。

- `package.json` の Command 定義に対応する `src/*.tsx` entry point が存在すること
- `package.json` の Block Set preferences が、`Enable Block Set N`、Block Set Folder、Block Set Name の構造を持つこと
- `package.json` の Preview preferences が、Preview Line Count と Preview Max Characters の構造を持つこと
- `src/services/markdownFiles.ts` が、拡張子 `.md` の Markdown ファイルを大文字小文字を区別せずに再帰的に検出できること
- `src/services/markdownFiles.ts` が `.git`、`node_modules`、隠しディレクトリ、拡張子が `.md` ではないファイルを除外できること
- `src/services/markdownFiles.ts` がディレクトリではない path をエラーにできること
- `src/services/markdownFiles.ts` が `All Block Sets` 用の横断検索で一部 Block Set の読み込み失敗と成功分の Markdown ファイルを分けて返せること
- `src/services/preview.ts` が指定行数と最大文字数に従って冒頭プレビューを返せること
- `src/services/dynamicPlaceholders.ts` が `{date}`、`{time}`、`{datetime}`、`{day}`、`{timezone}`、`{now}`、`{uuid}`、`{clipboard}` を置換できること
- `src/services/dynamicPlaceholders.ts` が複数の `{uuid}` を出現箇所ごとに別々の UUID へ置換できること
- `src/services/dynamicPlaceholders.ts` が `{clipboard}` を含まない Markdown 本文ではクリップボードを読み取らないこと

この単体確認は `local-verification/local-verification-fixtures` と `local-verification/local-verification-dist` を作成または更新する。

## 10. 書き換えを伴うコマンド

以下はファイルを書き換える可能性がある。

```bash
npm run fix-lint
```

```bash
npm run format
```

```bash
npm run migrate
```

これらは、修正目的が明確な場合だけ実行する。

## 11. 確認範囲

ローカル確認で扱う範囲は以下である。

- TypeScript の型整合性
- `src` 配下の ESLint 結果
- `package.json` の Prettier script で明示指定した管理対象ファイルの整形状態
- Raycast に依存しないサービス層の単体動作
- package manifest と entry point の整合性
- Raycast CLI を使わないローカル開発用 lint
- Raycast 手動動作確認用デモデータの生成と削除
- Raycast development mode での手動操作確認
- distribution build が成功すること

Raycast Store 用スクリーンショット作成は、Store 公開準備作業として扱う。手順は `docs/store-screenshots.md` を正とする。
