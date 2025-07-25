# Cursor Chat History Search - Raycast Extension

Cursorのチャット履歴を検索するRaycast Extensionです。ローカルに保存されているCursorのチャット履歴を素早く検索し、過去の会話内容を簡単に見つけることができます。

## 機能

- 📝 全てのワークスペースのチャット履歴を検索
- 🔍 タイトルとコンテンツでのフルテキスト検索
- 📅 日時とワークスペース情報の表示
- 📋 チャット内容のクリップボードへのコピー
- 🎼 通常のチャットとComposerセッションの区別
- 📖 詳細ビューでのマークダウン表示

## インストール

1. このリポジトリをクローンします：

```bash
git clone https://github.com/yourusername/cursor-chat-history.git
cd cursor-chat-history
```

2. 依存関係をインストールします：

```bash
npm install
```

3. Raycast Extension として開発モードで実行します：

```bash
npm run dev
```

## 使用方法

1. Raycastを開いて `Search Cursor Chat History` を検索します
2. 検索バーでキーワードを入力してチャット履歴を検索します
3. 検索結果から目的のチャットを選択します
4. 詳細ビューでチャット内容を確認できます
5. アクションパネルから内容をコピーできます

## Cursorチャット履歴の保存場所

このExtensionは以下の場所からCursorのチャット履歴を読み取ります：

- **macOS**: `~/Library/Application Support/Cursor/User/workspaceStorage`
- **Windows**: `%APPDATA%\Cursor\User\workspaceStorage`
- **Linux**: `~/.config/Cursor/User/workspaceStorage`

各ワークスペースフォルダ内の`state.vscdb`ファイルがSQLiteデータベースとして使用されます。

## 検索できるデータ

- チャット履歴（`workbench.panel.aichat.view.aichat.chatdata`）
- Composerセッション（`composer.composerData`）
- ユーザーとAIアシスタントの会話
- チャットタイトルと内容

## 技術仕様

- **プラットフォーム**: Raycast Extension (macOS)
- **言語**: TypeScript
- **データベース**: SQLite (better-sqlite3)
- **フレームワーク**: React + Raycast API

## 注意事項

- Node.js 22.14.0以上が推奨されます
- Cursorがインストールされている必要があります
- チャット履歴が存在しない場合は、空の結果が表示されます

## トラブルシューティング

### チャット履歴が見つからない場合

1. Cursorが正しくインストールされていることを確認してください
2. 少なくとも1つのチャットセッションが存在することを確認してください
3. 上記の保存場所にファイルが存在することを確認してください

### 検索結果が表示されない場合

1. 検索キーワードを変更してみてください
2. チャット履歴のデータベースファイルが破損していないか確認してください
3. Cursorを再起動してからもう一度試してください

## 開発

```bash
# 開発モードで実行
npm run dev

# ビルド
npm run build

# Lintチェック
npm run lint

# Lint修正
npm run fix-lint
```

## ライセンス

MIT License

## 貢献

プルリクエストや問題の報告は歓迎します。機能要求やバグ報告は、GitHubのIssuesにて行ってください。
