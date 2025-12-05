# 日本語タイピング練習 (Raycast Extension)

日本語のローマ字タイピングを練習するためのRaycast拡張機能です。リアルタイムフィードバックと履歴管理機能を備えています。

## 概要

### 主な機能
- **リアルタイムタイピング練習**: 日本語の単語・短文を題材にローマ字入力を練習
- **表記ゆれ対応**: JIS、ヘボン式、寛容な入力方式をサポート
- **進捗可視化**: CPM/WPM、正確性、連続正打数をリアルタイム表示
- **履歴管理**: 練習結果をローカル保存し、統計情報を表示
- **設定可能**: 練習時間、ローマ字規則、読み表示などをカスタマイズ
- **練習モード**: 単語モードと文章モードを選択可能
- **履歴保持設定**: 保存する履歴数を調整可能（10〜300件）

### 対応プラットフォーム
- macOS 13+
- Windows 10+
- Raycast 最新安定版

## リポジトリ構成

```
src/
├── commands/
│   └── typing.tsx          # メインコマンドのエントリーポイント
├── views/
│   ├── Practice.tsx        # 練習画面コンポーネント
│   ├── Result.tsx          # 結果表示画面コンポーネント
│   └── components/         # UIサブコンポーネント
├── engine/
│   ├── romanizer.ts        # ローマ字変換エンジン
│   ├── scorer.ts           # 採点・メトリクス計算
│   └── session.ts          # セッション状態管理 (FSM)
├── storage/
│   ├── history.ts          # 履歴保存・取得
│   ├── prefs.ts            # 設定管理
│   └── schema.ts           # スキーマ定義
├── data/
│   └── corpus.ts           # 内蔵コーパス（単語・短文）
├── types/
│   └── index.ts            # 型定義
├── utils/
│   └── time.ts             # 時間関連ユーティリティ
└── test/
    ├── romanizer.test.ts   # ローマ字変換のテスト
    ├── scorer.test.ts      # 採点機能のテスト
    ├── session.test.ts     # セッション状態のテスト
    ├── corpus.test.ts      # コーパス機能のテスト
    ├── prefs.test.ts       # 設定機能のテスト
    └── __mocks__/          # テスト用モック
```

documents/
├── plan/
│   ├── requirements.md     # 要件定義
│   ├── basic-design.md     # 基本設計
│   ├── practice-ui-redesign.md # UI設計
│   └── sentence-mode.md    # 文章モード設計

## セットアップ

### リポジトリクローン後の最初のコマンド群

```bash
# 1. Raycastドキュメントの準備（初回のみ、推奨）
git clone --depth=1 --filter=blob:none --sparse https://github.com/raycast/extensions.git raycast-ext
cd raycast-ext
git sparse-checkout set docs
cd ..

# 2. 依存パッケージのインストール
npm install

# 3. 開発環境の確認
npm run build
npm run test
npm run lint

# 4. 公開前の全項目チェック（必須）
npm run pre-publish-check

# 5. 開発モードで起動
npm run dev
```

## デバッグ

### 開発環境のセットアップ

1. Raycastドキュメントの準備（初回のみ）

開発前にRaycastのAPIドキュメントをローカルにダウンロードしておくことを推奨します：

```bash
git clone --depth=1 --filter=blob:none --sparse https://github.com/raycast/extensions.git raycast-ext
cd raycast-ext
git sparse-checkout set docs
```

これにより `raycast-ext/docs/` にAPIリファレンスが展開され、オフラインで参照できます。

2. 依存パッケージのインストール
```bash
npm install
```

3. 開発モードで起動
```bash
npm run dev
```

### デバッグ手順

1. **ビルドエラーの確認**
```bash
npm run build
```

2. **TypeScript型チェック**
```bash
npx tsc --noEmit
```

3. **ESLintによる静的解析**
```bash
npm run lint
```

4. **Raycastでのテスト**
   - Raycastを起動
   - "Japanese Typing Practice" を検索
   - 拡張機能を直接実行して動作確認

### ログの確認

開発中のログはRaycastの開発者コンソールで確認できます：
- Raycastメニュー → Developer → Show Developer Console

## テスト

### 単体テストの実行

```bash
# テスト実行
npm run test

# ウォッチモードでテスト
npm run test:watch
```

### テスト対象

- **romanizer**: ローマ字変換エンジンの表記ゆれ対応
- **scorer**: 採点計算の正確性
- **session**: セッション状態遷移のテスト

### カバレッジ

```bash
npm run test -- --coverage
```

### 手動テスト項目

1. **基本フロー**
   - 起動 → 練習開始 → 終了 → 結果表示
   - 一時停止/再開機能
   - スキップ機能

2. **入力判定**
   - JIS/ヘボン式の表記ゆれ
   - 拗音・促音・長音の処理
   - 大文字小文字の区別なし

3. **設定機能**
   - 各種設定の反映
   - 履歴保存・取得

## リリース手順

### 1. バージョン更新

```bash
# package.json のバージョンを更新
npm version patch  # または minor, major
```

### 2. ビルド

```bash
npm run build
```

### 3. テスト実行

```bash
npm run test
npm run lint
```

### 4. 公開前の全項目チェック（必須）

**アップデートや公開前には必ず実行してください**:

```bash
npm run pre-publish-check
```

このコマンドは以下を自動検証します：
- 依存関係のインストール
- Lintチェック（ESLint + Prettier）
- 全テストの実行（54テスト）
- ビルドの成功確認
- package.jsonの必須項目検証
- 必須ファイルの存在確認（LICENSE, README.en.md, CHANGELOG.md, アイコン）
- CHANGELOG形式の検証

### 5. Raycast Storeへの公開

```bash
npm run publish
```

### 6. CHANGELOGの更新

`CHANGELOG.md` に変更内容を記載：

```markdown
## [1.0.0] - 2025-11-07

### Added
- 日本語タイピング練習機能
- リアルタイムフィードバック
- 履歴管理機能
- 設定カスタマイズ機能

### Fixed
- 修正内容を記載
```

### 7. Gitタグの作成

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 開発ガイドライン

### コーディング規約
- TypeScriptを使用
- ESLintとPrettierでコード整形
- 機能ごとにファイルを分割
- 型定義を明確に記述

### コミットメッセージ
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コード整形
- `refactor`: リファクタリング
- `test`: テスト関連

### ブランチ戦略
- `main`: 安定版
- `develop`: 開発版
- `feature/*`: 機能開発

## ライセンス

MIT License

## 貢献

1. Forkする
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. コミットする (`git commit -m 'Add amazing feature'`)
4. プッシュする (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## サポート

問題が見つかった場合は、GitHub Issuesで報告してください。
