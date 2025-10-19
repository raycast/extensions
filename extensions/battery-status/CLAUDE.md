# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

macOSのバッテリー情報を表示するRaycastエクステンション。`system_profiler`コマンドを使用してバッテリーの状態、充電情報、健康状態などを取得し、RaycastのUIで表示します。

## 開発コマンド

### 基本コマンド
- `npm run dev` - 開発モードでエクステンションを実行（Raycast開発環境）
- `npm run build` - プロダクションビルド（distディレクトリに出力）
- `npm test` - テスト実行
- `npm run test:coverage` - カバレッジ付きテスト実行
- `npm run lint` - ESLintによるコードチェック
- `npm run fix-lint` - ESLintの自動修正
- `npm run publish` - Raycastストアへの公開

### Raycast CLI (`ray`)
このプロジェクトはRaycast CLIツールを使用しています：
- `ray develop` - 開発モードで実行
- `ray build -e dist` - ビルド
- `ray lint` - リント実行
- `ray lint --fix` - リント自動修正

## アーキテクチャ

### ファイル構成
- `src/battery-status.tsx` - メインのエクステンションコンポーネント
- `src/helpers.ts` - ヘルパー関数（ステータステキスト生成、時刻フォーマットなど）
- `src/i18n.ts` - 多言語対応（英語・日本語）
- `src/__tests__/` - テストファイル
  - `battery-status.test.ts` - メインコンポーネントのテスト
  - `helpers.test.ts` - ヘルパー関数のテスト
  - `i18n.test.ts` - 多言語対応のテスト
- `package.json` - プロジェクト設定とRaycastエクステンションのメタデータ
- `icon.png` - エクステンションアイコン

### コアロジック

**バッテリー情報の取得** (`parseBatteryInfo`関数):
- `/usr/sbin/system_profiler SPPowerDataType`を実行してバッテリー情報を取得
- 英語ロケール（`LANG: "C"`）で実行して出力の一貫性を確保
- 正規表現で必要な情報（充電量、充電状態、サイクル数など）を抽出
- TypeScript型 `BatteryInfo`で構造化されたデータを返す

**UI構造**:
- Raycastの`List`コンポーネントを使用
- 2つのセクション：「バッテリー情報」と「電源情報」
- 各アイテムに複数のアクセサリー（右側の補足情報）を表示
- `Cmd+R`で情報を更新する`RefreshAction`を実装

**状態管理**:
- `useState`でバッテリー情報、ローディング状態、最終更新時刻を管理
- `useEffect`で初回マウント時にバッテリー情報を取得
- ユーザーがアクションを実行した際に`updateBatteryInfo`で情報を再取得

### 技術スタック
- **React 18** - UIコンポーネント
- **@raycast/api** - Raycast拡張機能API
- **TypeScript** - 型安全性
- **Vitest** - テストフレームワーク（カバレッジ100%）
- **child_process (execSync)** - システムコマンド実行

### 多言語対応（i18n）

**実装方式**:
- `src/i18n.ts`で翻訳システムを実装
- 英語（en）と日本語（ja）の翻訳データを定義
- Raycast設定で言語を選択可能（English / 日本語 / 自動）

**言語検出**:
- 自動モード: `defaults read -g AppleLanguages`でmacOSシステム言語を取得
- 手動モード: Raycast設定から直接指定
- フォールバック: 検出失敗時は英語をデフォルトで使用

**使用方法**:
```typescript
import { t } from "./i18n";

// 翻訳キーから文字列を取得
const text = t("batteryStatus"); // 日本語: "バッテリー状態", 英語: "Battery Status"
```

**注意事項**:
- 言語変更はエクステンション再起動時に反映される
- リアルタイム切り替えは非対応（シンプルさ優先）

### テスト

**テストカバレッジ**: 100%

**テストファイル**:
- `battery-status.test.ts` - UIコンポーネントとバッテリー情報パース
- `helpers.test.ts` - ヘルパー関数（29テスト）
- `i18n.test.ts` - 多言語対応とエラーハンドリング（9テスト）

**モック**:
- `@raycast/api` - Raycast APIのモック
- `child_process` - システムコマンドのモック
- テストフィクスチャ: `src/__tests__/fixtures/system-profiler-outputs.ts`

## 開発時の注意点

### システムコマンドの実行
- `system_profiler`の出力フォーマットは英語ロケール（`LANG: "C"`）で統一
- macOS専用コマンドのため、プラットフォームは`macos`のみ対応
- コマンド実行エラーは適切にキャッチして、ユーザーフレンドリーなエラー表示

### Raycast API の使用
- エクステンションのモードは`view`（コンポーネントを表示）
- `List.Item`の`accessories`プロパティで複数の補足情報を右側に表示
- `ActionPanel`と`Action`でユーザーインタラクションを実装

### コーディング規約
- ESLintに`@raycast/eslint-config`を使用
- Prettierでコードフォーマット
- TypeScriptの`strict`モードを有効化
