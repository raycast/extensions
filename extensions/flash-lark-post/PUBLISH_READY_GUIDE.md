# Raycast Store 公開準備完了ガイド

このエクステンションをRaycast Storeで公開するための準備が整いました。

## ✅ 完了した準備作業

### 1. ファイル構造の整理
- ✅ `assets/icon.png` - アイコンファイルを適切な場所に配置
- ✅ `package.json` - アイコンパスを更新
- ✅ `.eslintrc.js` - ESLint設定を追加
- ✅ `.prettierrc` - Prettier設定を追加

### 2. 開発ツールの追加
- ✅ ESLint - コード品質チェック
- ✅ Prettier - コードフォーマット
- ✅ TypeScript設定の最適化

### 3. ドキュメントの整備
- ✅ README.md - プロジェクト説明
- ✅ SETUP_GUIDE.md - セットアップ手順
- ✅ DISTRIBUTION_METHODS.md - 配布方法ガイド

## 🚀 Raycast Store 公開手順

### 1. 最終チェック
```bash
# プロジェクトディレクトリで実行
npm run lint          # コード品質チェック
npm run build         # ビルドテスト
```

### 2. 公開コマンド実行
```bash
npm run publish
```

### 3. ブラウザでの設定
公開コマンド実行後、ブラウザが開きます：

1. **Raycastアカウントでログイン**
2. **エクステンション情報を入力**：
   - **Title**: "Lark Quick Memo"
   - **Description**: "Send quick memos to Lark/Feishu with one action"
   - **Category**: "Productivity"
   - **Keywords**: "lark, feishu, memo, productivity, messaging"

3. **詳細説明**：
   ```
   📨 A Raycast extension for sending quick memos to Lark/Feishu with one action. 
   
   Features:
   🚀 One-Action Memo: Send text to your Lark DM with just Cmd+Shift+M → type → Cmd+Enter
   🌍 Global & China Support: Switch between open.larksuite.com and open.feishu.cn endpoints
   ⏰ Optional Timestamps: Automatically prefix messages with [YYYY-MM-DD HH:mm:ss]
   🔒 Secure Authentication: App credentials stored securely in Raycast Keychain
   ⚡ Smart Retry: Exponential backoff for rate limiting (429 errors)
   📱 Native UX: HUD notifications for success/failure feedback
   ```

4. **スクリーンショット**：
   - エクステンションの使用画面をキャプチャ
   - 設定画面のスクリーンショット
   - 実際のメッセージ送信画面

### 4. レビュー待ち
- Raycastチームによるレビュー（通常3-7日）
- 承認後に自動的にストアで公開

## 📸 推奨スクリーンショット

以下の画面をキャプチャすることをお勧めします：

1. **メイン画面**: `Cmd+Shift+M`で起動した時の画面
2. **設定画面**: エクステンションの設定画面
3. **成功画面**: メッセージ送信成功時のHUD表示

## 🔍 公開前の最終チェックリスト

- [ ] すべての機能が正常に動作する
- [ ] エラーハンドリングが適切
- [ ] 設定画面が分かりやすい
- [ ] ドキュメントが充実している
- [ ] アイコンが魅力的
- [ ] 説明文が分かりやすい
- [ ] スクリーンショットが準備できている

## 💡 公開成功のコツ

1. **明確な価値提案**: 何の問題を解決するかを明確に
2. **優れたUX**: 直感的で使いやすいインターフェース
3. **適切なキーワード**: 検索されやすいキーワードを選択
4. **魅力的なスクリーンショット**: 実際の使用場面を示す

## 🎯 公開後の対応

### 1. ユーザーフィードバック
- Raycast Store のレビューを確認
- GitHubでのIssue対応
- 機能改善の検討

### 2. アップデート
```bash
# 新しいバージョンをリリース
npm version patch  # または minor, major
npm run publish
```

### 3. プロモーション
- SNSでの紹介
- ブログ記事の執筆
- コミュニティでの共有

---

これで Lark Quick Memo エクステンションをRaycast Storeで公開する準備が完了しました！

`npm run publish` を実行して、世界中のRaycastユーザーにあなたのエクステンションを届けましょう。