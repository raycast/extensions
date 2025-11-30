# Raycast Store 公開チェックリスト

このドキュメントは Raycast Store に Extension を公開する前に確認すべき項目をまとめています。

---

## ✅ 公開前チェックリスト

### 1. 必須ファイルの確認

- [x] **package.json** が正しく設定されている
  - [x] `name`: `prompt-pocket`
  - [x] `title`: `Prompt Pocket`
  - [x] `description`: 適切な説明文
  - [x] `author`: `marty-martini`
  - [x] `license`: `MIT`
  - [x] `icon`: `assets/icon.png`
  - [x] `categories`: Productivity, Developer Tools
  - [x] `keywords`: prompt, clipboard, template, text, snippet
  - [x] `commands`: 本番用コマンドのみ

- [x] **assets/icon.png** が配置されている
  - [x] サイズ: 512x512px 以上推奨
  - [x] フォーマット: PNG

- [x] **LICENSE** ファイルが存在する
  - [x] MIT License
  - [x] Copyright (c) 2025 marty-martini

- [x] **README.md**（英語版）が存在する
  - [x] Extension の説明
  - [x] 機能一覧
  - [x] 使い方
  - [x] インストール方法
  - [x] 日本語版へのリンク

- [x] **README.ja.md**（日本語版）が存在する
  - [x] 英語版 README へのリンク

---

### 2. スクリーンショットの準備

- [ ] **metadata/** フォルダにスクリーンショットを配置
  - [ ] 3-5枚のスクリーンショット
  - [ ] 幅 1600px 以上
  - [ ] PNG または JPG フォーマット
  - [ ] ファイル名: `prompt-pocket-1.png`, `prompt-pocket-2.png`, ...

推奨スクリーンショット:
1. プロンプト一覧画面
2. 検索機能のデモ
3. プロンプト作成/編集画面
4. プレースホルダー機能のデモ
5. 詳細表示画面（オプション）

詳細は [`metadata/README.md`](metadata/README.md) を参照してください。

---

### 3. コードの品質チェック

- [ ] **ビルドが成功する**
  ```bash
  npm run build
  ```

- [ ] **Lint エラーがない**
  ```bash
  npm run lint
  ```

- [ ] **テストが通る**
  ```bash
  npm run test:run
  ```

- [ ] **開発モードで動作確認**
  ```bash
  npm run dev
  ```
  - [ ] プロンプトの作成ができる
  - [ ] プロンプトの編集ができる
  - [ ] プロンプトの削除ができる
  - [ ] 検索機能が動作する
  - [ ] クリップボードへのコピーが動作する
  - [ ] プレースホルダー機能が動作する
  - [ ] タグ機能が動作する

---

### 4. 不要なファイルの削除

- [x] テスト用コマンドを削除
  - [x] `src/create-sample-prompts.tsx`
  - [x] `scripts/create-sample-prompts.ts`

- [ ] 開発用ファイルの確認
  - [ ] `.git` フォルダは除外される（自動）
  - [ ] `node_modules` は除外される（自動）
  - [ ] テスト用データは含まれていない

---

### 5. ドキュメントの最終確認

- [x] **README.md**
  - [x] 誤字脱字がない
  - [x] リンクが正しく機能する
  - [x] コードブロックが正しくフォーマットされている

- [x] **README.ja.md**
  - [x] 誤字脱字がない
  - [x] 英語版との整合性が取れている

- [ ] **ARCHITECTURE.md**（オプション）
  - [ ] 技術的な詳細が記載されている（任意）

---

### 6. Raycast Store ガイドラインの確認

- [x] **命名規則**
  - [x] Extension 名は小文字とハイフンのみ（`prompt-pocket`）
  - [x] タイトルはタイトルケース（`Prompt Pocket`）

- [x] **説明文**
  - [x] 簡潔で分かりやすい（80文字以内推奨）
  - [x] 機能が明確に伝わる

- [x] **カテゴリとキーワード**
  - [x] 適切なカテゴリが選択されている
  - [x] 検索に有効なキーワードが設定されている

- [ ] **スクリーンショット**
  - [ ] 主要機能が網羅されている
  - [ ] 高品質で読みやすい
  - [ ] 個人情報が含まれていない

---

### 7. Git の状態確認

- [ ] **すべての変更がコミットされている**
  ```bash
  git status
  ```

- [ ] **適切なコミットメッセージ**
  ```bash
  git log --oneline -5
  ```

- [ ] **GitHub にプッシュ済み**
  ```bash
  git push origin main
  ```

---

## 🚀 公開手順

すべてのチェックリストが完了したら、以下のコマンドで公開プロセスを開始します：

```bash
npm run publish
```

### 公開プロセスの流れ

1. **コマンド実行**: `npm run publish`
2. **情報入力**: CLIが対話的に情報を収集
   - Extension の詳細確認
   - スクリーンショットの選択
   - 公開先の確認
3. **PR 作成**: Raycast Extensions リポジトリにプルリクエストが自動作成
4. **レビュー待ち**: Raycast チームによるレビュー（通常 1-3 営業日）
5. **フィードバック対応**: 必要に応じて修正
6. **マージ**: PR がマージされると Store に公開

---

## 📋 公開後の確認

Extension が公開されたら：

- [ ] **Store ページの確認**
  - Raycast Store で Extension を検索
  - 説明文、スクリーンショットが正しく表示されているか確認

- [ ] **インストールテスト**
  - Store からインストールして動作確認
  - 主要機能がすべて動作するか確認

- [ ] **ユーザーフィードバック**
  - GitHub Issues でフィードバックを受け付ける
  - Raycast コミュニティでの反応を確認

---

## 🔄 アップデート手順

公開後にアップデートする場合：

1. **バージョンアップ**
   ```bash
   # package.json の version を更新
   # 例: "1.0.0" → "1.1.0"
   ```

2. **変更内容の記載**
   - CHANGELOG.md を作成（推奨）
   - GitHub Release で変更内容を公開

3. **再公開**
   ```bash
   npm run publish
   ```

---

## 📚 参考リンク

- [Raycast Developers Documentation](https://developers.raycast.com/)
- [Raycast Store Guidelines](https://developers.raycast.com/information/publishing)
- [Extensions Repository](https://github.com/raycast/extensions)
- [Raycast Community](https://raycast.com/community)

---

## ❓ トラブルシューティング

### ビルドエラーが発生する

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

### Lint エラーが発生する

```bash
# 自動修正を試す
npm run fix-lint
```

### 公開コマンドが失敗する

- GitHub の認証情報を確認
- Raycast CLI が最新版か確認
  ```bash
  npm install -g @raycast/api@latest
  ```

---

## ✨ 次のステップ

公開が完了したら：

1. **SNS で共有**: Twitter, LinkedIn などで Extension を紹介
2. **コミュニティ参加**: Raycast Slack や Discord に参加
3. **フィードバック収集**: ユーザーからの意見を集めて改善
4. **機能追加**: 新機能の開発とアップデート

---

**Good luck with your Extension! 🎉**

