# tex2typst (Raycast Extension)

TeX と Typst の相互変換を、Raycast からワンアクションで行う拡張機能です。

## 機能

- TeX -> Typst 変換（クリップボードの TeX を Typst に変換してコピー）
- Typst -> TeX 変換（クリップボードの Typst を TeX に変換してコピー）
- 成功/失敗を Raycast のトーストで通知

変換ロジックは `tex2typst` ライブラリに依存しています。


## 使い方

1. 変換したいテキストをクリップボードにコピーします。
   - TeX を Typst にしたい場合: TeX をコピーして「Convert TeX to Typst」を実行
   - Typst を TeX にしたい場合: Typst をコピーして「Convert Typst to TeX」を実行
2. 実行後、結果はクリップボードへ上書きコピーされます。
3. 成功/失敗はトーストで表示されます。

補足:

- 本拡張は `no-view` モードで動作し、UI は表示しません（トーストのみ）。

## コマンド一覧

- Convert TeX to Typst (`convert-tex-to-typst`)
- Convert Typst to TeX (`convert-typst-to-tex`)

## 開発

インストールと開発サーバー起動:

```bash
npm install
npm run dev
```

ビルド:

```bash
npm run build
```

Lint:

```bash
npm run lint
npm run fix-lint
```

公開（Raycast Store へ）:

```bash
npm run publish
```

## ライセンス

Apache License 2.0