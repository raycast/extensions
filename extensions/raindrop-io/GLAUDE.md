# Raindrop.io Extension Enhancement Project

## プロジェクト概要
RaycastのRaindrop.io拡張機能をフォークして、「Latest Bookmarks」に新しいアクション機能を追加する。

## 開発要件

### 1. 基本機能追加
- **対象**: `Latest Bookmarks` コマンド
- **新機能**: 「Open and Archive」アクション
- **ショートカット**: `cmd+o`
- **動作**: 
  1. 選択されたブックマークをブラウザで開く
  2. 同時にそのブックマークをarchiveコレクションに移動する

### 2. アクション詳細仕様
- **表示名**: "Open and Archive"
- **アイコン**: Archive (Lucide React)
- **配置位置**: Deleteアクションの上
- **優先度**: リンクを開くことを優先（コレクション移動は失敗してもリンクは開く）

### 3. エラーハンドリング
- **リンクを開く処理**: 最優先で実行
- **コレクション移動失敗時**: Raycastトースト通知でエラー表示
- **成功時**: 特別な通知なし、Latest Bookmarksを自動リロード

### 4. Archive コレクション
- **前提**: archiveコレクションは既存（コレクションIDは不明）
- **ID取得方法**: 名前からコレクションIDを動的に検索・取得

### 5. 開発ツール
- **コレクション確認スクリプト**: `npm run show-collections` で全コレクション一覧とIDを表示
- **用途**: 開発・デバッグ用

## 技術要件

### API仕様
- **Raindrop.io API**: 既存の認証方式（Bearer Token）を継続使用
- **必要なエンドポイント**:
  - GET `/collections` - コレクション一覧取得
  - PUT `/raindrop/{id}` - ブックマークのコレクション変更

### 実装箇所
- **ベースコード**: `https://github.com/raycast/extensions/tree/main/extensions/raindrop-io`
- **主な変更ファイル**: Latest Bookmarks関連のコンポーネント
- **新規追加**: package.jsonにスクリプト追加

### Error Handling パターン
```typescript
try {
  // 1. リンクを開く（最優先）
  await openInBrowser(bookmark.link);
  
  // 2. archiveコレクションIDを取得
  const collections = await getCollections();
  const archiveCollection = collections.find(c => c.title.toLowerCase() === 'archive');
  
  if (!archiveCollection) {
    throw new Error('Archive collection not found');
  }
  
  // 3. ブックマークを移動
  await moveToCollection(bookmark.id, archiveCollection._id);
  
  // 4. リストを更新
  await revalidate();
  
} catch (error) {
  // コレクション移動の失敗のみトースト表示
  if (error.message.includes('collection') || error.message.includes('move')) {
    showToast({
      style: Toast.Style.Failure,
      title: "Archive移動に失敗しました",
      message: error.message
    });
  }
}
```

### NPM Script 追加
```json
{
  "scripts": {
    "show-collections": "node scripts/show-collections.js"
  }
}
```

## 実装チェックリスト
- [ ] 既存コードの分析と理解
- [ ] Archive アクションの実装
- [ ] コレクションID動的取得機能
- [ ] エラーハンドリング実装
- [ ] トースト通知実装
- [ ] リスト自動リロード機能
- [ ] コレクション確認スクリプト作成
- [ ] テスト実行
- [ ] 動作確認

## 注意事項
- リンクを開く処理は他の処理に関係なく必ず実行する
- 既存の機能に影響を与えないよう注意
- Raindrop.io APIのレート制限に注意
- 既存のコードスタイルに合わせる

## 期待される成果物
1. 機能拡張されたRaindrop.io拡張機能
2. コレクション確認用スクリプト
3. 適切なエラーハンドリングとユーザーフィードバック
4. 既存機能の非破壊的拡張
