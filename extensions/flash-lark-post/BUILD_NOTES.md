# ビルドに関する注意事項

## TypeScriptエラーについて

現在、このプロジェクトではReactの型定義に関するTypeScriptエラーが発生する可能性があります。これは`@raycast/api`と`@types/react`のバージョン間の互換性の問題によるものです。

### 対処方法

1. **開発時**: Raycastの開発モードでは型エラーがあっても正常に動作します
   ```bash
   npm run dev
   ```

2. **ビルド時**: 型エラーが発生した場合は、以下の方法で対処できます：

#### 方法1: TypeScript設定の調整
`tsconfig.json`で以下の設定を追加/調整：
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "suppressImplicitAnyIndexErrors": true,
    "noStrictGenericChecks": true
  }
}
```

#### 方法2: 依存関係の更新
```bash
npm update @raycast/api @types/react
```

#### 方法3: 型チェックを無視してビルド
```bash
# TypeScriptの型チェックを無視
npx ray build -e dist
```

### 友人への配布時の注意

- このプロジェクトは機能的には完全に動作します
- 型エラーは実行時の動作には影響しません
- Raycastでの実際の使用には問題ありません
- 必要に応じて上記の対処方法を友人に伝えてください

### 推奨事項

友人の環境でセットアップする際は：
1. まず `npm run dev` で開発モードで動作確認
2. Raycastで実際にエクステンションが動作することを確認
3. 型エラーが気になる場合のみ上記の対処方法を適用

このエラーは開発体験に影響するものの、エクステンションの実際の機能には影響しません。