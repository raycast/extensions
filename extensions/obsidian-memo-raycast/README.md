# Obsidian Memo - Raycast Extension

Raycast内で瞬時に複数行メモを入力してObsidianのDaily Noteに直接追加できる拡張機能です。

## セットアップ（Local）

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発モードで起動

```bash
npm run dev
```

### 3. Raycastで拡張機能を有効化

1. Raycastを開く (⌘+Space)
2. "Extensions" を検索
3. 開発中の拡張機能一覧で "Obsidian Memo" を確認
4. 有効化

### 4. 設定を行う

1. Raycastで拡張機能の設定画面を開く
2. **Obsidian Vault Path** を設定（必須）
3. 必要に応じて他の設定をカスタマイズ

## 設定項目

### 必須設定

- **Obsidian Vault Path**: Obsidianボルトのパス  
  例: `/Users/username/Documents/MyVault` または `~/Documents/MyVault`

### オプション設定

- **Daily Notes Path**: Daily Noteのパスパターン  
  デフォルト: `200_Daily/{{DATE:YYYY-MM-DD(ddd)}}.md`
- **Template Path**: テンプレートファイルのパス  
  デフォルト: `999_Templates/DailyNote.md`
- **Journal Section**: メモを追加するセクション  
  デフォルト: `## Journal`
- **Entry Format**: エントリーのフォーマット  
  デフォルト: `###### {{time}}\n{{content}}`

## 日付フォーマット変数

Daily Notes Pathで使用できる変数：

- `{{DATE:YYYY-MM-DD(ddd)}}`: 完全な日付形式
- `YYYY`: 4桁年（例: 2025）
- `YY`: 2桁年（例: 25）
- `MM`: 2桁月（例: 01）
- `M`: 月（例: 1）
- `DD`: 2桁日（例: 27）
- `D`: 日（例: 27）
- `ddd`: 曜日（日本語、例: 月）
- `dd`: 曜日（英語3文字、例: Mon）

## エントリーフォーマット変数

Entry Formatで使用できる変数：

- `{{time}}`: 現在時刻（HH:MM形式、例: 14:30）
- `{{content}}`: 入力されたメモの内容

## 使用方法

### 基本的な使い方

1. **Raycastを開く** (`⌘+Space`)
2. **"Add Memo to Obsidian"** を検索・選択
3. **複数行のメモを入力**
4. **⌘+Enter** でDaily Noteに追加

### キーボードショートカット

- `⌘+Enter`: メモをDaily Noteに追加
- `⌘+Escape`: キャンセルしてRaycastを閉じる

## 動作仕様

1. **ファイル検索**: 設定された日付フォーマットでDaily Noteファイルを検索
2. **ファイル作成**: 存在しない場合、テンプレートから新規作成
3. **セクション検索**: 指定されたセクション（`## Journal`など）を検索
4. **セクション作成**: セクションが見つからない場合は新しく作成
5. **メモ追加**: セクション内の適切な位置にフォーマットされたメモを追加

## 技術仕様

- **フレームワーク**: React + TypeScript
- **API**: Raycast Extensions API + Node.js File System
- **ファイル操作**: 直接ファイルシステムアクセス
- **アーキテクチャ**: カスタムフック + ユーティリティによるモジュール設計

## ファイル構成

```
├── package.json              # 拡張機能の設定・環境設定
├── tsconfig.json             # TypeScript設定
├── src/
│   ├── constants/
│   │   └── texts.ts          # 文言定数管理
│   ├── hooks/
│   │   └── useMemoSubmit.ts  # メモ送信ロジック
│   ├── utils/
│   │   ├── dateUtils.ts      # 日付フォーマット処理
│   │   └── fileUtils.ts      # ファイル操作処理
│   └── memo-input.tsx        # メインのReactコンポーネント
└── README.md                 # このファイル
```

## 開発・カスタマイズ

### ローカル開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint
npm run lint
```

## トラブルシューティング

### よくある問題

1. **テンプレートが見つからない**
   - Template Pathが正しく設定されているか確認
   - テンプレートファイルが存在するか確認
   - 存在しない場合は自動的にデフォルトのDaily Noteが作成されます

2. **メモが想定の場所に追加されない**
   - Journal Sectionの設定を確認（例: `## Journal`）
   - セクションが存在しない場合は自動作成されます

3. **ファイル権限エラー**
   - Raycastがファイルシステムにアクセスする権限があるか確認
   - macOSのセキュリティ設定で許可されているか確認

## ライセンス

MIT License
