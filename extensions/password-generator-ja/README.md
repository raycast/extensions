# Password Generator — Raycast Extension

カスタムルールで強力なパスワードを生成する Raycast 拡張機能です。
Generate strong passwords with custom rules.

## Features / 機能

- パスワード長の指定 (13–128)
- 大文字 (A-Z) / 小文字 (a-z) / 数字 (0-9) / 記号のオン・オフ
- 数字・記号の最小含有数の指定
- `crypto.randomInt` による乱数生成 + Fisher-Yates シャッフル
- ワンアクションでコピー / `⌘R` で再生成
- 9言語対応 (Preferences → Language): en, ja, zh_CN, zh_TW, ko, ru, es, fr, de

## Commands

| Command | Title |
| ------- | ----- |
| `index` | Generate Password |

## Development / 開発

```bash
npm install
npm run dev    # Raycast で開発モード起動
npm run lint   # Lint
npm run build  # ビルド (dist/)
```

## Preferences

- `Language` — 拡張機能 UI の表示言語 (default: `en`)

### How to change the language / 言語の変更方法

**English:**
You can change the language of the extension UI at any time.
1. Open Raycast Settings (`⌘,`).
2. Go to `Extensions` → `Password Generator`.
3. Change the `Language` preference to one of: English (`en`), 日本語 (`ja`), 简体中文 (`zh_CN`), 繁體中文 (`zh_TW`), 한국어 (`ko`), Русский (`ru`), Español (`es`), Français (`fr`), Deutsch (`de`).
4. Re-run the `Generate Password` command to see the UI in the new language.

**日本語:**
拡張機能 UI の言語はいつでも変更できます。
1. Raycast の設定を開く (`⌘,`)。
2. `機能拡張 (Extensions)` → `Password Generator` を開く。
3. `Language` の設定を以下から変更する: English (`en`)、日本語 (`ja`)、简体中文 (`zh_CN`)、繁體中文 (`zh_TW`)、한국어 (`ko`)、Русский (`ru`)、Español (`es`)、Français (`fr`)、Deutsch (`de`)。
4. `Generate Password` コマンドを再実行すると、新しい言語で表示されます。

## License

MIT — see [LICENSE](./LICENSE).
