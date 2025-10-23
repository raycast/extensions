# Raycastエクステンション配布方法ガイド

Lark Quick Memoエクステンションを友人や他のユーザーに配布する方法を説明します。

## 🎯 配布方法の選択肢

### 1. 🏪 Raycast Store（公式ストア）- **推奨**

**メリット:**
- ✅ 最も簡単な配布方法
- ✅ 自動アップデート対応
- ✅ 検索・発見しやすい
- ✅ Raycastが品質をレビュー
- ✅ 多くのユーザーにリーチ可能

**デメリット:**
- ❌ レビュープロセスが必要（数日〜1週間）
- ❌ Raycastの承認が必要

#### 公開手順:

1. **事前準備**
   ```bash
   cd lark-quick-memo
   npm run lint          # コードの品質チェック
   npm run build         # ビルドテスト
   ```

2. **Raycast Store に公開**
   ```bash
   npm run publish
   ```

3. **公開プロセス**
   - Raycastアカウントでログイン
   - エクステンション情報の入力
   - スクリーンショットのアップロード
   - レビュー待ち（通常3-7日）
   - 承認後に公開

4. **必要な情報**
   - エクステンションの説明
   - カテゴリ選択
   - スクリーンショット（推奨: 2-3枚）
   - 使用方法の説明

### 2. 👨‍💻 開発者モード配布

**メリット:**
- ✅ 即座に配布可能
- ✅ レビュープロセス不要
- ✅ プライベート配布に最適

**デメリット:**
- ❌ 受け取る側が開発者モードを有効にする必要
- ❌ 手動でのインストールが必要
- ❌ 自動アップデート非対応

#### 配布手順:

1. **プロジェクトの準備**
   ```bash
   # 不要なファイルを除外
   rm -rf node_modules dist
   
   # ZIPファイルを作成
   zip -r lark-quick-memo.zip lark-quick-memo/ -x "*/node_modules/*" "*/dist/*" "*/.git/*"
   ```

2. **友人への配布**
   - ZIPファイルを送付
   - <mcfile name="SETUP_GUIDE.md" path="/Users/mashimaro/FlashLarkPost 2/lark-quick-memo/SETUP_GUIDE.md"></mcfile> を一緒に送付

3. **友人側でのインストール**
   ```bash
   # ZIPを解凍
   unzip lark-quick-memo.zip
   cd lark-quick-memo
   
   # 依存関係をインストール
   npm install
   
   # Raycastに追加
   # Raycast → Extensions → Develop Extensions → Add Extension
   ```

### 3. 📦 GitHub リポジトリ配布

**メリット:**
- ✅ バージョン管理
- ✅ Issue/PR管理
- ✅ 透明性の高い開発
- ✅ コミュニティ貢献可能

**デメリット:**
- ❌ GitHubアカウントが必要
- ❌ 技術的な知識が必要

#### 配布手順:

1. **GitHubリポジトリ作成**
   ```bash
   # GitHubでリポジトリを作成後
   cd lark-quick-memo
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/lark-quick-memo.git
   git push -u origin main
   ```

2. **README更新**
   - インストール手順を記載
   - 使用方法を説明
   - ライセンス情報を追加

3. **リリース作成**
   - GitHubのReleases機能を使用
   - ZIPファイルを添付
   - 変更履歴を記載

## 🎯 推奨配布戦略

### 個人的な友人への配布
→ **開発者モード配布** がおすすめ
- 即座に配布可能
- セットアップサポートが容易

### 広く一般に公開したい場合
→ **Raycast Store公開** がおすすめ
- 最大のリーチ
- 自動アップデート
- 信頼性の向上

### オープンソースとして公開
→ **GitHub + Raycast Store** の組み合わせ
- コミュニティ貢献
- 透明性
- 広いリーチ

## 📋 公開前チェックリスト

### Raycast Store公開の場合

- [ ] **機能テスト**: すべての機能が正常に動作する
- [ ] **エラーハンドリング**: 適切なエラーメッセージが表示される
- [ ] **パフォーマンス**: レスポンスが良好
- [ ] **ドキュメント**: README.mdが充実している
- [ ] **スクリーンショット**: 魅力的な画面キャプチャを準備
- [ ] **説明文**: 分かりやすいエクステンション説明
- [ ] **カテゴリ**: 適切なカテゴリを選択
- [ ] **キーワード**: 検索しやすいキーワードを設定

### 開発者モード配布の場合

- [ ] **セットアップガイド**: <mcfile name="SETUP_GUIDE.md" path="/Users/mashimaro/FlashLarkPost 2/lark-quick-memo/SETUP_GUIDE.md"></mcfile> が最新
- [ ] **依存関係**: package.jsonが正確
- [ ] **ビルドテスト**: `npm install && npm run build` が成功
- [ ] **機密情報**: ハードコーディングされた認証情報がない
- [ ] **ファイル整理**: 不要なファイルが含まれていない

## 🚀 実際の公開手順（Raycast Store）

```bash
# 1. 最終チェック
npm run lint
npm run build

# 2. Raycast Store に公開
npm run publish

# 3. ブラウザでRaycastアカウントにログイン

# 4. エクステンション情報を入力:
#    - Title: "Lark Quick Memo"
#    - Description: "Send quick memos to Lark/Feishu with one action"
#    - Category: "Productivity"
#    - Keywords: "lark, feishu, memo, productivity"

# 5. スクリーンショットをアップロード

# 6. 公開申請を送信

# 7. レビュー結果を待つ（3-7日）
```

## 💡 成功のコツ

1. **明確な価値提案**: エクステンションが解決する問題を明確に
2. **優れたUX**: 直感的で使いやすいインターフェース
3. **適切なドキュメント**: セットアップと使用方法の説明
4. **継続的な改善**: ユーザーフィードバックに基づく更新

---

どの配布方法を選択するかは、対象ユーザーと目的によって決まります。まずは友人への配布から始めて、フィードバックを得てからRaycast Storeでの公開を検討することをお勧めします。