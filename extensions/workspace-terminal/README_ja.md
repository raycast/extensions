# Workspace Terminal - Raycast Extension

[English](README.md) | [日本語](README_ja.md)

Raycast から VS Code Project Manager に保存済みのワークスペースを選び、好みのターミナルで開きます。必要に応じて `claude`、`gh copilot`、開発サーバー起動コマンドなども同時に実行できます。

Workspace Terminal は、VS Code Project Manager 拡張で既に保存したプロジェクトを読み込みます。ディレクトリの自動スキャンや、別のプロジェクト一覧の管理は不要です。

## 必要環境

- macOS
- Raycast
- Project Manager 拡張をインストール済みの VS Code
- Project Manager に保存済みのプロジェクトが 1 件以上あること
- 対応ターミナルのいずれかがインストールされていること
  - Ghostty
  - iTerm
  - Terminal.app
  - Warp
  - kitty
  - Alacritty
  - WezTerm

一部のターミナル連携では AppleScript やアプリ固有の自動操作を使います。初回起動時に macOS から「オートメーション」や「アクセシビリティ」の権限を求められる場合があります。

## 使い方

1. 依存関係をインストールし、開発モードを起動します。

   ```bash
   npm install
   npm run dev
   ```

2. Raycast を開き、**Open Workspace** を実行します。
3. VS Code Project Manager に保存済みのワークスペースを選択します。
4. Enter を押すと、設定されたターミナルでワークスペースが開きます。

## Preferences

Raycast の拡張設定から変更できます。

| Preference | 説明 |
| --- | --- |
| **VS Code App** | Project Manager の保存データを読み込む VS Code 互換アプリ。既定値は Visual Studio Code。 |
| **Project Manager Data Path** | Project Manager のデータディレクトリ、または `projects.json` ファイルを上書き指定するための設定。 |
| **Terminal** | ワークスペースを開くターミナル。 |
| **Default Command** | ワークスペースを開いた後に実行するコマンド。空欄の場合はターミナルを開くだけです。 |
| **Command Mode** | 起動コマンドの実行方法。既定値は `Keep Shell After Command` です。詳しくは下の「Command Mode の違い」を参照してください。 |
| **Reuse Existing Window** | 既存ウィンドウの再利用を試みます。対応状況はターミナルごとに異なります。 |
| **Shell Path** | コマンド実行に使うシェル。既定値は `/bin/zsh`。 |
| **Group Projects by Tag** | Project Manager のタグごとにプロジェクトをグループ表示します。 |
| **Hide Projects Without Tags** | タグがないプロジェクトを非表示にします。 |
| **Hide Disabled Projects** | `enabled` が `false` の項目を非表示にします。 |

### Command Mode の違い

| Mode | 動作 | 向いている用途 |
| --- | --- | --- |
| **Keep Shell After Command** | ワークスペースを開いた後、指定コマンドを実行し、終了後もシェルを残します。内部的には `command; exec <shell>` のように実行します。 | `claude` や `gh copilot`、短いセットアップコマンドの後もそのまま同じターミナルで作業したい場合。 |
| **Command Only** | 指定コマンドだけを実行します。コマンドが終了した後にシェルを残す処理は追加しません。 | 実行後にターミナルが閉じてもよいコマンドや、コマンド自身が対話セッションを管理する場合。 |
| **Open Only** | コマンドを実行せず、ワークスペースのディレクトリでターミナルを開くだけです。 | プロジェクトを開いてから手動でコマンドを入力したい場合。 |

既定値は **Keep Shell After Command** です。迷った場合もこのモードを使うのがおすすめです。コマンドがすぐ終了してもターミナルが残るため、Ghostty などで「コマンド終了後にウィンドウも閉じる/警告が出る」挙動を避けやすくなります。

## Actions

| Action | Shortcut | 説明 |
| --- | --- | --- |
| **Open in Terminal** | Enter | 解決されたコマンド付きでワークスペースを開きます。 |
| **Open Without Command** | Cmd Shift Enter | コマンドを実行せずにワークスペースを開きます。 |
| **Open with Custom Command…** | Option Enter | 今回だけ使うコマンドを入力して起動します。 |
| **Set Project Command…** | Cmd S | 選択中のプロジェクト専用の起動コマンドを保存します。 |
| **Clear Project Command** | - | プロジェクト専用の起動コマンドを削除します。 |
| **Open in VS Code** | Cmd O | 設定された VS Code アプリでワークスペースを開きます。 |
| **Copy Path** | Cmd . | ワークスペースのパスをコピーします。 |
| **Show in Finder** | - | ワークスペースフォルダを Finder に表示します。 |

起動コマンドは次の優先順位で解決されます。

1. プロジェクト専用コマンド
2. **Default Command** の設定値
3. コマンドなし

## Project Manager のデータ

既定では、選択された VS Code アプリ名から Project Manager の保存場所を解決します。

```text
~/Library/Application Support/<VS Code App>/User/globalStorage/alefragnani.project-manager/projects.json
```

通常の VS Code では次の場所です。

```text
~/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json
```

Project Manager のデータを別の場所に保存している場合は、**Project Manager Data Path** にデータディレクトリ、または `projects.json` ファイルを指定してください。

`vscode-remote://...` のようなリモート VS Code プロジェクトは一覧には表示されますが、現時点ではローカルターミナルで開くことはできません。

## 開発

依存関係をインストールします。

```bash
npm install
```

Raycast の開発モードを起動します。

```bash
npm run dev
```

lint を実行します。

```bash
npm run lint
```

lint とフォーマットの自動修正を実行します。

```bash
npm run fix-lint
```

拡張をビルドします。

```bash
npm run build
```

ビルド結果は `dist/` に出力されます。

## 注意事項

- 最新の `@raycast/api` は、ローカルの Node.js が推奨バージョンより古い場合に警告を出すことがあります。engine warning が出る場合は Node 22.22.2 以降を使用してください。
- Warp のコマンド付き起動では、一時的な Launch Configuration YAML ファイルを使用します。
- kitty で既存ウィンドウを再利用するには、kitty の remote control を有効にする必要があります。
- Ghostty は `ghostty +new-window` ではなく、AppleScript 連携を使って起動します。
