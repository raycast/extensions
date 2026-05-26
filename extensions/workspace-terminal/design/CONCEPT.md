# 設計書: Raycast 拡張「Workspace Terminal」

> VS Code **Project Manager** に登録したワークスペースを一覧から選び、**指定したターミナルアプリ**で開き、開いた直後に**規定コマンド（`claude` / `gh copilot` など）を自動実行**する Raycast 拡張機能。

- ストア表示名（案）: **Workspace Terminal**（→ 命名とストア競合は §13 を参照）
- リポジトリ名（案）: `workspace-terminal`
- バージョン: Draft v0.2
- 対象 OS: macOS（Raycast / 各ターミナルが macOS 前提）
- 言語/SDK: TypeScript + React（`@raycast/api`）

---

## 1. 目的とスコープ

### 1.1 目的
VS Code の Project Manager 拡張で登録済みのワークスペースを、Raycast から最小手数でターミナルに開き、開発開始時の定型コマンド（AI コーディングエージェント等）まで一気に走らせる。

### 1.2 やること（In Scope）
1. Project Manager の登録データ（`projects.json`）を読み、ワークスペース一覧を表示する。
2. ユーザーが選んだワークスペースを、設定で指定したターミナルアプリで開く。
3. 開いた直後に規定コマンド（グローバル設定 + プロジェクト個別上書き）を実行する。
4. ターミナルアプリは設定（dropdown）で切り替え可能にする。

### 1.3 やらないこと（Out of Scope / 初版）
- Project Manager の **自動検出プロジェクト**（Git/SVN/Mercurial/VSCode の `baseFolders` スキャン結果）の取り込み。これは VS Code 拡張がランタイムで動的計算するもので `projects.json` には保存されないため、初版では「手動保存した Favorites のみ」を対象とする（→ §11 で将来拡張）。
- VS Code 以外の IDE を開く機能（本拡張はターミナル起動に特化）。
- Windows / Linux 対応。

---

## 2. 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1 | `projects.json` を読み込み、`name` でフィルタ可能な List を表示する | Must |
| FR-2 | 選択したワークスペースの `rootPath` を作業ディレクトリにしてターミナルを開く | Must |
| FR-3 | 開いた直後に規定コマンドを実行できる（空なら何もしない） | Must |
| FR-4 | 起動ターミナルを設定で選べる（Ghostty / iTerm2 / Terminal / Warp / kitty / Alacritty / WezTerm） | Must |
| FR-5 | 規定コマンドをプロジェクト単位で上書き保存できる | Should |
| FR-6 | コマンド実行モードを選べる（コマンドのみ / 実行後シェル継続 / 開くだけ） | Should |
| FR-7 | `projects.json` の場所を設定で上書きできる（`projectManager.projectsLocation` 利用者向け） | Should |
| FR-8 | サブアクション: 「コマンドなしで開く」「都度コマンド入力」「パスをコピー」「VS Code で開く」 | Could |

---

## 3. 前提・依存

- VS Code に **Project Manager**（`alefragnani.project-manager`）が導入され、1件以上「Save Project」済みであること。
- 選択ターミナルアプリが `/Applications` 等にインストール済みであること。
- Raycast がアクセシビリティ/自動化権限を持つこと（AppleScript を使うターミナルで必要）。

---

## 4. データソース仕様（projects.json）

### 4.1 保存場所
macOS の既定パスは下記（新しめの VS Code）:

```
~/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json
```

- 古い VS Code では `~/Library/Application Support/Code/User/projects.json` の場合がある。
- `projectManager.projectsLocation` 設定で任意の場所に変更されている場合があるため、**FR-7 のパス上書き設定**を用意し、未設定時は上記 2 候補を順にフォールバック探索する。
- VS Code Insiders 利用時は `Code` が `Code - Insiders` になる点に注意。

### 4.2 フォーマット
配列。各要素の主なフィールド:

```json
[
  {
    "name": "My API",
    "rootPath": "$home/dev/my-api",
    "paths": [],
    "tags": ["work"],
    "enabled": true
  }
]
```

| フィールド | 型 | 扱い |
|-----------|----|------|
| `name` | string | List のタイトル |
| `rootPath` | string | 作業ディレクトリ。`~` / `$home` を含み得るので展開が必要 |
| `paths` | string[] | マルチルートワークスペース用。初版は `rootPath` を優先し、空なら `paths[0]` を使用 |
| `tags` | string[] | List のアクセサリ/フィルタに利用（任意） |
| `enabled` | boolean | `false` は一覧から除外 |

### 4.3 パス正規化ルール
- 先頭の `~` または `$home` を `os.homedir()` に置換。
- `.code-workspace` ファイルが指定されている場合は親ディレクトリを cwd とする（ターミナルはフォルダを開くため）。
- 存在しないパスは List に「警告アクセサリ」を付けるか、起動時に Toast でエラー表示。

---

## 5. UI / コマンド設計

### 5.1 Raycast コマンド
| name | mode | 説明 |
|------|------|------|
| `open-workspace` | `view` | メインの一覧コマンド（List） |

### 5.2 List 表示
- `List.Item`
  - `title` = `name`
  - `subtitle` = 表示用に短縮した `rootPath`（`~` 表記に戻す）
  - `accessories` = タグ、個別コマンド上書きありなら 🛠 アイコン等
  - `keywords` = `tags` を含めて検索性向上
- 上部に検索バー（Raycast 標準のフィルタで `title`/`keywords` を絞り込み）。

### 5.3 ActionPanel（アクション設計）
| 順 | アクション | 動作 | ショートカット例 |
|----|-----------|------|-----------------|
| 1 (Primary) | Open in {terminal} | 規定コマンド付きで開く | `⏎` |
| 2 | Open without Command | コマンドなしで開く | `⌘⏎` |
| 3 | Open with Custom Command… | フォームでコマンド入力して開く | `⌥⏎` |
| 4 | Set Project Command… | このプロジェクトの規定コマンドを保存（LocalStorage） | `⌘S` |
| 5 | Open in VS Code | `code <path>` 相当 | `⌘O` |
| 6 | Copy Path | `rootPath` をコピー | `⌘.` |
| 7 | Open in Other Terminal ▸ | サブメニューで一時的に別ターミナルへ | |

実行後は `closeMainWindow()` し、`showHUD("Opened {name} in {terminal}")` でフィードバック。

---

## 6. 設定（Preferences / Manifest）

`package.json` の `preferences` に定義。型は Raycast が対応する `dropdown` / `textfield` / `checkbox` / `file` を使用。

| name | type | 既定 | 用途 |
|------|------|------|------|
| `terminalApp` | `dropdown` | `ghostty` | 起動ターミナル選択（FR-4） |
| `defaultCommand` | `textfield` | （空） | グローバル規定コマンド（例 `claude`） |
| `commandMode` | `dropdown` | `keepShell` | `commandOnly` / `keepShell` / `none`（FR-6） |
| `shellPath` | `textfield` | `$SHELL` | `keepShell` で復帰させるシェル |
| `projectsJsonPath` | `file` | （空＝自動探索） | パス上書き（FR-7） |
| `reuseWindow` | `checkbox` | `false` | 可能なターミナルでは既存インスタンスに新規ウィンドウ/タブを開く |

### 6.1 dropdown 定義例（terminalApp）
```jsonc
{
  "name": "terminalApp",
  "title": "Terminal",
  "description": "Which terminal app to open workspaces in",
  "type": "dropdown",
  "required": true,
  "default": "ghostty",
  "data": [
    { "title": "Ghostty",   "value": "ghostty" },
    { "title": "iTerm2",    "value": "iterm" },
    { "title": "Terminal",  "value": "terminal" },
    { "title": "Warp",      "value": "warp" },
    { "title": "kitty",     "value": "kitty" },
    { "title": "Alacritty", "value": "alacritty" },
    { "title": "WezTerm",   "value": "wezterm" }
  ]
}
```

### 6.2 値の取得
```ts
import { getPreferenceValues } from "@raycast/api";
const prefs = getPreferenceValues<Preferences>(); // Preferences 名前空間は manifest から自動型付け
```

---

## 7. ターミナル起動の実装方針（中核）

ターミナルごとに起動方法が大きく異なるため、**アダプタパターン**で吸収する。各アダプタは共通インターフェースを実装する。

### 7.1 共通インターフェース
```ts
export interface LaunchRequest {
  cwd: string;          // 正規化済み絶対パス
  command?: string;     // 規定 or 個別コマンド（空なら開くだけ）
  mode: "commandOnly" | "keepShell" | "none";
  shell: string;        // keepShell 用
  reuseWindow: boolean;
}

export interface TerminalAdapter {
  id: string;
  /** 実行可能な launch を行う（execFile / runAppleScript / open URI 等） */
  launch(req: LaunchRequest): Promise<void>;
  /** command 実行をサポートするか（Warp は YAML 経由のため要注意） */
  supportsDynamicCommand: boolean;
}
```

### 7.2 コマンド組み立て（command-builder）
`mode` に応じて実際に走らせる文字列を生成する。

```ts
function buildExec(req: LaunchRequest): string | null {
  if (!req.command || req.mode === "none") return null;
  if (req.mode === "commandOnly") return req.command;
  // keepShell: コマンド実行後に対話シェルへ復帰
  const sh = req.shell || process.env.SHELL || "/bin/zsh";
  return `${sh} -i -c ${shellQuote(`${req.command}; exec ${sh}`)}`;
}
```
> `claude` や `gh copilot` のように常駐するコマンドなら `commandOnly` でも問題ないが、終了する単発コマンドだと即シェルが閉じる/警告が出るため、既定は `keepShell` を推奨。

### 7.3 各ターミナルの起動方法

> 共通注意: パス・コマンドは必ずエスケープ/クォートする。`execFile`（配列引数）を優先し、シェル文字列連結を避けることでインジェクションを防ぐ。

#### Ghostty
macOS では `ghostty` CLI から直接 GUI を起動できず、`open` 経由が標準。`--working-directory` と `-e`（`--command` のエイリアス）をサポート。

```bash
open -na Ghostty.app --args --working-directory="<cwd>" -e "<exec>"
```
- 既存インスタンスがある場合、`open -n` で新規ウィンドウが開く（バージョンにより挙動差あり）。`reuseWindow` 用には新しめの IPC コマンド `ghostty +new-window --working-directory=<cwd> -e <exec>` を利用（IPC は `--working-directory` / `--command`(`-e`) / `--title` をサポート）。
- 注意: `-e` のコマンドが即終了すると Ghostty が「異常終了」と判断し警告を出す。`keepShell` モードで回避する。

#### iTerm2（AppleScript）
細かい制御が可能。`reuseWindow` は新規ウィンドウ or 新規タブで分岐。

```applescript
tell application "iTerm"
  set w to (create window with default profile)
  tell current session of w
    write text "cd <cwd> && <exec>"
  end tell
end tell
```

#### Terminal（AppleScript）
`do script` は新規ウィンドウ/タブを開き、その中でコマンドを実行する。

```applescript
tell application "Terminal"
  activate
  do script "cd <cwd> && <exec>"
end tell
```

#### Warp
URI スキームでフォルダは開けるが **コマンドの動的引き渡しは未対応**。コマンドを走らせたい場合は Launch Configuration（YAML）が必要。

- フォルダのみ:
  ```bash
  open "warp://action/new_window?path=<URLエンコードした cwd>"
  # 既存ウィンドウにタブで開く場合:
  open "warp://action/new_tab?path=<URLエンコードした cwd>"
  ```
- コマンド付き（推奨手順）:
  1. `~/.warp/launch_configurations/` に一時 YAML を生成（`cwd` は**絶対パス必須**、`~` 不可）:
     ```yaml
     ---
     name: __pm_temp_<hash>
     windows:
       - tabs:
           - layout:
               cwd: <絶対パスの cwd>
             commands:
               - exec: <command>
     ```
  2. `open "warp://launch/__pm_temp_<hash>"` で起動。
  3. 起動後に一時 YAML をクリーンアップ。
- アダプタの `supportsDynamicCommand` は「URI 単体では false / YAML 生成を許可すれば true」。設定 `commandMode=none` または `defaultCommand` 空のときは URI 直叩きで十分。

#### kitty
CLI 引数でディレクトリとプログラムを指定可能。`reuseWindow` はリモートコントロールで実現。

```bash
# 新規プロセス
open -na kitty --args --directory "<cwd>" <exec...>
# 既存インスタンスへ（remote control 有効時）
kitty @ launch --type=window --cwd "<cwd>" <exec...>
```

#### Alacritty
`--working-directory` と `-e` をサポート（基本は新規プロセス）。

```bash
open -na Alacritty --args --working-directory "<cwd>" -e <exec...>
```

#### WezTerm
`start` でディレクトリとコマンドを指定。既存インスタンスへは `cli spawn`。

```bash
# 新規
open -na WezTerm --args start --cwd "<cwd>" -- <exec...>
# 既存インスタンスへ
wezterm cli spawn --cwd "<cwd>" -- <exec...>
```

### 7.4 ターミナル機能マトリクス

| ターミナル | フォルダで開く | コマンド実行 | 主手段 | 既存インスタンス再利用 |
|-----------|:---:|:---:|------|:---:|
| Ghostty | ✓ | ✓ | `open --args` / IPC | △（IPC `+new-window`） |
| iTerm2 | ✓ | ✓ | AppleScript | ✓ |
| Terminal | ✓ | ✓ | AppleScript | ✓ |
| Warp | ✓ | △ | URI / Launch Config YAML | △ |
| kitty | ✓ | ✓ | CLI 引数 / remote control | ✓ |
| Alacritty | ✓ | ✓ | CLI 引数 | ✗ |
| WezTerm | ✓ | ✓ | CLI 引数 / `cli spawn` | ✓ |

> △ = 制約付き（Warp はコマンド実行に YAML 必須、Ghostty の再利用は対応バージョン依存）。

---

## 8. アーキテクチャ / ファイル構成

```
workspace-terminal/
├── package.json              # Manifest（commands / preferences / categories / deps）
├── package-lock.json         # CI で同一依存を保証（必須）
├── tsconfig.json
├── eslint.config.js
├── README.md                 # セットアップ手順（権限・projects.json 前提）
├── CHANGELOG.md              # 変更履歴（審査・更新で参照される）
├── assets/
│   └── extension-icon.png    # 512x512 PNG（ライト/ダーク両対応が望ましい）
├── metadata/                 # ストア掲載スクショ（最低1枚・必須 / 最大6枚）
│   ├── workspace-terminal-1.png
│   ├── workspace-terminal-2.png
│   └── workspace-terminal-3.png
└── src/
    ├── open-workspace.tsx     # メイン List コマンド
    ├── set-command.tsx        # （任意）個別コマンド設定フォーム
    └── lib/
        ├── projects.ts        # projects.json 探索/読込/正規化
        ├── preferences.ts     # 型と取得ヘルパ
        ├── command-builder.ts # exec 文字列の生成
        ├── storage.ts         # 個別コマンド上書き（LocalStorage）
        └── terminals/
            ├── index.ts       # id → アダプタの登録/解決
            ├── types.ts       # LaunchRequest / TerminalAdapter
            ├── ghostty.ts
            ├── iterm.ts
            ├── terminal.ts
            ├── warp.ts
            ├── kitty.ts
            ├── alacritty.ts
            └── wezterm.ts
```

### 8.1 主要 npm 依存
- `@raycast/api`（List/Action/preferences/LocalStorage/open/showHUD）
- `js-yaml`（Warp Launch Configuration の生成）
- `tildify`（表示用パスの短縮）

---

## 9. 主要モジュール仕様

### 9.1 `lib/projects.ts`
```ts
export type Project = { name: string; rootPath: string; tags?: string[] };

export async function loadProjects(): Promise<Project[]> {
  const path = await resolveProjectsJsonPath(); // 設定 → 既定2候補をフォールバック
  const raw = await fs.readFile(path, "utf8");
  const json = JSON.parse(raw) as Array<{
    name: string; rootPath?: string; paths?: string[];
    tags?: string[]; enabled?: boolean;
  }>;
  return json
    .filter((p) => p.enabled !== false)
    .map((p) => ({
      name: p.name,
      rootPath: normalizePath(p.rootPath ?? p.paths?.[0] ?? ""),
      tags: p.tags,
    }))
    .filter((p) => p.rootPath.length > 0);
}
```
- `normalizePath`: `~` / `$home` 展開、`.code-workspace` → 親ディレクトリ、絶対パス化。
- 読込失敗（ファイル無し/JSON 不正）は空配列 + `List.EmptyView` で導線（「Project Manager で Save Project してね」）。

### 9.2 `lib/terminals/index.ts`
```ts
const adapters: Record<string, TerminalAdapter> = {
  ghostty, iterm, terminal, warp, kitty, alacritty, wezterm,
};
export const getAdapter = (id: string) => adapters[id] ?? ghostty;
```

### 9.3 起動フロー（open-workspace.tsx）
1. `loadProjects()` を `usePromise` で取得し List 表示。
2. Primary アクション実行時:
   - 個別コマンド上書き（`storage`）→ 無ければ `defaultCommand`。
   - `LaunchRequest` を組み立て、`getAdapter(prefs.terminalApp).launch(req)`。
   - `closeMainWindow()` + `showHUD`。
3. 例外は `showToast({ style: Failure })`。

---

## 10. エラーハンドリング / エッジケース

| ケース | 対応 |
|--------|------|
| `projects.json` が見つからない | EmptyView で案内、設定でパス上書きを促す |
| `rootPath` が存在しない | List で警告アクセサリ、起動時に失敗 Toast |
| ターミナル未インストール | 起動失敗を検知し「{terminal} が見つかりません」Toast |
| Warp でコマンド指定 | 一時 YAML を生成→起動→クリーンアップ。失敗時は URI フォールバック（フォルダのみ） |
| Ghostty の `-e` 即終了警告 | `keepShell` を既定にして回避 |
| パス/コマンドに空白・特殊文字 | `execFile` の配列引数 or 適切なクォートでインジェクション防止 |
| AppleScript 権限未許可 | Toast で「システム設定 → プライバシーとセキュリティ → オートメーション」を案内 |

---

## 11. 拡張性 / 将来課題

- **自動検出プロジェクトの取り込み**: 設定 `projectManager.git.baseFolders` 等を読み、Raycast 側でも Git リポジトリをスキャンして一覧に統合（Project Manager 本体と同等の見え方に近づける）。
- **マルチルート対応**: `paths` を複数ペイン/タブで開く（kitty/WezTerm/iTerm のレイアウトを活用）。
- **タグでのグルーピング表示**（`List.Section`）。
- **最近開いた順の並べ替え**（`LocalStorage` に最終起動時刻を保存）。
- **Quicklink / Fallback コマンド対応**でルート検索からの直接起動。
- **コマンドプリセット**（`claude` / `gh copilot` / `git status` など）を dropdown で選択。

---

## 12. ネーミングとストア競合

### 12.1 採用名
- ストア表示名: **Workspace Terminal**
- リポジトリ名 / フォルダ名: `workspace-terminal`

### 12.2 競合状況（要注意）
ターミナル起動系・プロジェクト起動系の既存拡張が複数存在する。Raycast の審査ガイドラインでは「ストアに非常に似た価値を提供する既存拡張がある」場合は却下対象となるため、価値の差別化を明確にする必要がある。

| 既存拡張 | 価値提案 | 重なり |
|---------|---------|--------|
| Code Runway | 「プロジェクトを検索してターミナル/エディタで起動するプロジェクトランチャー」 | 高（"Project Launcher" 名は特に衝突） |
| Terminal Finder | Finder で開いているフォルダをターミナルで開く | 中 |
| Ghostty 拡張 / Ghostty Layouts | Ghostty 起動・レイアウト管理 | 中（Ghostty 限定） |

→ 「**Project Launcher**」は Code Runway のタグラインとほぼ同義のため**不採用**。

### 12.3 差別化（審査を通すための主張）
1. **VS Code Project Manager の `projects.json` を直接の単一ソースにする**（ディレクトリ再スキャンではなく、既存の手動登録を再利用）。
2. **起動直後に規定コマンドを自動実行**し、かつ**プロジェクト単位でコマンドを上書き**できる（AI エージェント起動ワークフロー）。
3. 上記2点を README / description で明示し、「フォルダを開くだけ」「ディレクトリをスキャンするだけ」の既存拡張と区別する。

### 12.4 命名規約メモ
- 拡張名・コマンド名は **Apple Style Guide** に準拠（Title Case、製品名の正しい表記）。
- 名前に「Raycast」や制限ワードを含めない。
- 公開前に Raycast ストア（`raycast.com/store`）とモノレポ `extensions/` 配下で同名フォルダの有無を再確認する。

---

## 13. ストア掲載情報（メタデータ / 説明文）

### 13.1 package.json の主要メタデータ
```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "workspace-terminal",
  "title": "Workspace Terminal",
  "description": "Open your VS Code Project Manager workspaces in your favorite terminal and auto-run a startup command.",
  "icon": "extension-icon.png",
  "author": "<raycast-username>",
  "categories": ["Developer Tools", "Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "open-workspace",
      "title": "Open Workspace in Terminal",
      "subtitle": "Workspace Terminal",
      "description": "Search VS Code Project Manager workspaces and open them in a terminal.",
      "mode": "view"
    }
  ]
}
```
- `description`（拡張のサブタイトル）は1文・差別化点を含める。
- `categories` は**必須**。Developer Tools / Productivity が妥当。
- コマンドの `title` は動詞始まりの命令形（Apple Style）。

### 13.2 ストア説明文（コピー案）

**短い説明（1行・`description` 用）**
> Open your VS Code Project Manager workspaces in your favorite terminal and auto-run a startup command.

**README 冒頭（ストア詳細に表示される本文）**
> Workspace Terminal bridges the projects you've already saved in the VS Code **Project Manager** extension with your terminal. Pick a workspace from Raycast, open it in your terminal of choice — Ghostty, iTerm2, Terminal, Warp, kitty, Alacritty, or WezTerm — and have it automatically run a startup command such as `claude`, `gh copilot`, or your dev server. Set a global default command, or override it per project.
>
> **Features**
> - Reads workspaces directly from VS Code Project Manager (`projects.json`) — no separate setup.
> - Choose your terminal app in preferences.
> - Auto-run a configurable command on open (global default + per-project override).
> - "Run then keep shell" mode so the shell stays interactive after the command.

**日本語補足（README に併記する場合）**
> VS Code の Project Manager に登録済みのワークスペースを、Raycast から任意のターミナルで開き、`claude` などの起動コマンドを自動実行します。

### 13.3 スクリーンショット（`metadata/`）
- **最低1枚必須・推奨3枚以上・最大6枚**。
- Raycast の **Window Capture**（Advanced Preferences でホットキー設定、開発モードで撮影）を使うと、開発用アイコンが除去された規定サイズ（16:10 / 2000×1250 px 相当）の PNG が `metadata/` に保存される。
- 推奨カット: ①ワークスペース一覧、②ActionPanel（Open / Custom Command 等）、③Preferences（ターミナル選択 + 規定コマンド）。

### 13.4 アイコン
- 512×512 PNG。ライト/ダーク両テーマで視認性を確認（デフォルトの Raycast アイコンのままだと却下）。

### 13.5 README に必須で書くべき前提
- VS Code に Project Manager を導入し「Save Project」済みであること。
- 選択ターミナルがインストール済みであること。
- AppleScript を使うターミナル（iTerm2 / Terminal）はオートメーション権限が必要なこと（「システム設定 → プライバシーとセキュリティ → オートメーション」）。

---

## 14. 申請・公開フロー

公式 Raycast ストアへの公開は **`raycast/extensions` モノレポへの PR** で行う（承認制）。

### 14.1 事前チェック（Prepare for Store）
1. `npm run build` をローカルで実行し、エラーなく通ること（配布用ビルド + 型チェック）。
2. `npm run lint`（後で CI でも自動実行される）。
3. ガイドラインを満たすことを確認（命名・カテゴリ・スクショ・README・`package-lock.json` の同梱）。
4. 配布ビルドを Raycast で開き、意図通り動くか確認。

### 14.2 公開コマンド
```bash
# 拡張ディレクトリで
npm run build      # 検証のみ（ストアへは送らない）
npm run publish    # 公開（PR 作成フローへ）
```
- `publish` スクリプトが無い場合は package.json の `scripts` に追加:
  ```json
  "publish": "npx @raycast/api@latest publish"
  ```

### 14.3 PR ベースの公開手順（推奨・確実）
1. `raycast/extensions` を **Fork**。
2. `extensions/workspace-terminal/` に一式を配置（src / package.json / metadata / README / CHANGELOG）。
3. Fork から本家へ **Pull Request** を作成（PR テンプレートに沿って記入）。
4. 自動チェック（lint / build / schema 検証）を通す。
5. **Community Managers のレビュー**を受ける（通常 **初回レビューまで約5営業日**、繁忙期は10〜15営業日のことも）。
6. 承認・マージ後、ストアに公開される。

> 自動の `npm run publish` でも PR は作られるが、David Alecrim 等の実例では「Fork → 手動 PR」の方が制御しやすいとされる。どちらでも最終的にはレビュー必須。

### 14.4 審査でよく指摘される項目（チェックリスト）
- [ ] `categories` フィールドが無い → **必須**
- [ ] `metadata/` にスクショが無い → **最低1枚必須**
- [ ] `Preferences` 型を手書きしている → Raycast の自動生成型（`Preferences` 名前空間）を使う
- [ ] README が無く、セットアップ（権限・projects.json 前提）が不明
- [ ] アイコンがデフォルトのまま
- [ ] 既存拡張と価値が酷似 → §12.3 の差別化を README/description で明示
- [ ] `package-lock.json` 未同梱（CI の依存固定に必要）
- [ ] eslint 設定が flat config（`@raycast/eslint-config`）になっていない

### 14.5 社内/個人配布（任意・審査不要）
公開審査を経ずに使う場合は、ローカルで「Import Extension」して使う、または Teams/Organization の**プライベートストア**へ `extensions-template`（`RAYCAST_ORGANIZATION_TOKEN` を使った GitHub Actions 自動公開）で配布する選択肢もある。

---

## 15. 参考リンク

- Raycast Manifest（preferences の型: dropdown / appPicker / file ほか）: https://developers.raycast.com/information/manifest
- Raycast Preferences API（`getPreferenceValues`, `Preferences` 名前空間）: https://developers.raycast.com/api-reference/preferences
- Raycast File Structure（拡張の構成）: https://developers.raycast.com/information/file-structure
- VS Code Project Manager（projects.json / `projectsLocation`）: https://github.com/alefragnani/vscode-project-manager
- projects.json パスの変遷（globalStorage 配下）: https://github.com/kbshl/alfred-vscode/issues/18
- Ghostty: macOS での `open -na ... --working-directory ... -e`: https://github.com/ghostty-org/ghostty/discussions/4254
- Ghostty IPC `+new-window`（`--working-directory`/`--command`/`-e`）: https://man.archlinux.org/man/ghostty.1
- Warp URI Scheme（`new_window`/`new_tab`/`launch`）: https://docs.warp.dev/terminal/more-features/uri-scheme/
- Warp Launch Configurations（YAML / `commands` / `cwd` 絶対パス必須）: https://docs.warp.dev/terminal/sessions/launch-configurations.md
- Warp + Raycast 拡張の URI 実装例: https://github.com/raycast/extensions/blob/main/extensions/warp/src/uri.ts
- Raycast: Prepare an Extension for Store（命名/スクショ/Window Capture）: https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast: Publish an Extension（`npm run build` / `npm run publish`）: https://developers.raycast.com/basics/publish-an-extension
- Raycast Extensions Guidelines（審査基準 / 却下条件 / 制限ワード）: https://manual.raycast.com/extensions-guidelines
- Raycast extensions-template（プライベートストア自動公開）: https://github.com/raycast/extensions-template
- Code Runway（競合: project launcher / terminal 起動）: https://www.raycast.com/gongchr/code-runway