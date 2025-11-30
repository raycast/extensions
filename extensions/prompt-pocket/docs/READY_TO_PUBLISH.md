# 🎉 Raycast Store 公開準備完了

すべての準備作業が完了しました！以下の手順で公開プロセスを開始してください。

## ✅ 完了した作業

1. **コード品質の修正**
   - ✅ `.eslintignore` を作成し、Markdown ファイルを除外
   - ✅ すべての Lint エラーを解決
   - ✅ すべてのテスト（109テスト）が通過

2. **アイコン**
   - ✅ アイコンを512x512pxにリサイズ

3. **スクリーンショット**
   - ✅ `metadata/` フォルダに配置
   - ✅ 2000x1250px にリサイズ（Raycast 要件を満たす）
   - 📸 `prompt-pocket-1.png` - メイン画面
   - 📸 `prompt-pocket-2.png` - 編集画面  
   - 📸 `prompt-pocket-3.png` - アクション画面

4. **Git**
   - ✅ すべての変更をコミット
   - ✅ main ブランチにマージ
   - ✅ リモートにプッシュ済み

## 🚀 公開手順

### ステップ1: 公開コマンドを実行

ターミナルで以下のコマンドを実行してください：

```bash
npm run publish
```

### ステップ2: 対話式プロセスに従う

コマンドを実行すると、Raycast CLI が以下の情報を確認します：

1. **Extension の詳細確認**
   - 名前: `Prompt Pocket`
   - 説明: `Save, edit, and reuse text prompts with ease`
   - カテゴリ: `Productivity`, `Developer Tools`

2. **スクリーンショットの選択**
   - CLI が `metadata/` フォルダから自動的にスクリーンショットを検出
   - 3枚のスクリーンショットすべてを含めることを確認

3. **GitHub 認証**
   - GitHub アカウントでの認証が必要
   - アクセストークンの入力を求められる場合があります

4. **PR 作成**
   - CLI が Raycast Extensions リポジトリに自動的にプルリクエストを作成
   - PR が作成されたら URL が表示されます

### ステップ3: PR レビューを待つ

- **レビュー期間**: 通常 1-3 営業日
- **フィードバック対応**: 必要に応じて修正
- **マージ**: PR がマージされると Store に公開されます

## 📋 公開後の確認事項

Extension が公開されたら：

1. **Store ページの確認**
   - https://www.raycast.com/marty-martini/prompt-pocket にアクセス
   - 説明文、スクリーンショットが正しく表示されているか確認

2. **インストールテスト**
   - Store からインストールして動作確認
   - 主要機能（作成、編集、削除、検索、コピー、プレースホルダー）をテスト

3. **ユーザーフィードバック**
   - GitHub Issues でフィードバックを受け付ける
   - Raycast コミュニティでの反応を確認

## 🔧 トラブルシューティング

### 公開コマンドが失敗する場合

1. **GitHub 認証エラー**
   ```bash
   # GitHub の認証情報を確認
   gh auth status
   ```

2. **Raycast CLI の更新**
   ```bash
   npm install -g @raycast/api@latest
   ```

3. **再試行**
   ```bash
   npm run publish
   ```

## 📚 参考リンク

- [Raycast Developers Documentation](https://developers.raycast.com/)
- [Raycast Store Guidelines](https://developers.raycast.com/information/publishing)
- [Extensions Repository](https://github.com/raycast/extensions)
- [Raycast Community](https://raycast.com/community)

## 🎉 次のステップ

公開が完了したら：

1. **SNS で共有**: Twitter, LinkedIn などで Extension を紹介
2. **コミュニティ参加**: Raycast Slack や Discord に参加
3. **フィードバック収集**: ユーザーからの意見を集めて改善
4. **機能追加**: 新機能の開発とアップデート

---

**Good luck with your Extension! 🎉**

準備が整いました。ターミナルで `npm run publish` を実行して公開プロセスを開始してください！

