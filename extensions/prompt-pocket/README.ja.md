# Prompt Pocket

テキストプロンプトを効率的に管理・再利用するための Raycast Extension です。

[English README](README.md)

## 機能

- 💾 テキストプロンプトの保存・整理
- 🔍 プロンプトの検索
- 📋 クリップボードへの素早いコピー
- 🏷️ タグベースの整理
- ✏️ 簡単な編集・管理
- 🎯 プレースホルダーのサポート：`{clipboard}` と `{cursor}`

## 使い方

1. `Manage Prompts` コマンドでプロンプトの表示・管理を行います
2. `Enter` キーでプロンプトをクリップボードにコピー
3. `⌘ + N` で新しいプロンプトを作成
4. `⌘ + E` で既存のプロンプトを編集
5. `⌘ + ⌫` でプロンプトを削除

### プレースホルダー

プロンプトは動的なプレースホルダーに対応しています：

- **`{clipboard}`**: 現在のクリップボードの内容を挿入
- **`{cursor}`**: ペースト後のカーソル位置を設定

使用例：
```
バグレポート: {clipboard}

再現手順:
1. {cursor}
2. 
3. 
```

## インストール

[Raycast Store](https://www.raycast.com/marty-martini/prompt-pocket) からインストール

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev

# Extension をビルド
npm run build
```

### テスト

このプロジェクトには包括的なユニットテストと統合テストが含まれています：

- 4つのテストファイルで **109 テスト**
- ユーティリティ関数のユニットテスト
- 型検証テスト
- プレースホルダー処理のテスト
- ストレージレイヤーの統合テスト

```bash
# ウォッチモードですべてのテストを実行
npm test

# 一度だけテストを実行（CI モード）
npm run test:run

# カバレッジレポートを表示
npm run test:coverage
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください

