# Password Generator — Raycast Extension

カスタムルールで強力なパスワードを生成する Raycast 拡張機能です。
Generate strong passwords with custom rules.

## Features / 機能

- パスワード長の指定 (13–128)
- 大文字 (A-Z) / 小文字 (a-z) / 数字 (0-9) / 記号のオン・オフ
- 数字・記号の最小含有数の指定
- `crypto.randomInt` による乱数生成 + Fisher-Yates シャッフル
- ワンアクションでコピー / `⌘R` で再生成

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

## License

MIT — see [LICENSE](./LICENSE).
