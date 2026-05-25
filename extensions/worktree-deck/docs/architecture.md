# worktree-deck アーキテクチャ方針

最終確認日: 2026-05-25

## 1. このドキュメントの目的

このドキュメントは、`worktree-deck` の実装で採用するアーキテクチャ方針を定義する。

## 2. アーキテクチャ原則

- 関心事を `domain` / `application` / `interface-adapters` / `infrastructure` / `UI` に分離する。
- 依存方向は外側から内側へ向ける。
- ビジネスルールは `domain` に閉じ込め、外部 I/O の都合を持ち込まない。
- ユースケース手順は `application` で定義し、具体実装の選択は `interface-adapters` と Composition Root に委譲する。
- 削除済み worktree 履歴の保持期間など、永続化内容に対する業務ルールは `application` で判定し、書き戻しだけを `infrastructure` に委譲する。
- 外部システム連携（Git、ファイル、コマンド実行）は `infrastructure` で扱う。
- UI は表示とユーザー操作に集中し、外部実装の詳細を持たない。

## 3. 層ごとの責務

### domain

- 純粋な判定・変換ロジックを提供する。
- 外部依存を受け取らない。
- 例: `worktree-filter.service.ts`, `worktree-merge.service.ts`, `repository-mapping.service.ts`,
  `session-log-parser.service.ts`, `worktree-ide-app.service.ts`。

### application

- ユースケース単位で処理フローを定義する。
- 依存は `*Dependencies` ポートとして受け取る。
- 例: `list-worktrees.usecase.ts`, `worktree-merge.usecase.ts`, `remove-worktree.usecase.ts`,
  `deleted-worktrees.usecase.ts`, `worktree-deck-snapshot.usecase.ts`。

### interface-adapters

- `application` のポートを `infrastructure` 実装へ接続する。
- 外部由来の失敗吸収やフォールバックを担当する。
- 例: `list-worktrees-dependencies.ts`, `worktree-merge-dependencies.ts`,
  `deleted-worktrees-dependencies.ts`。

### infrastructure

- Git 実行、ファイル I/O、実行設定読込、キャッシュ永続化などを実装する。
- `domain` 判断ロジックは持たない。
- 例: `worktree-store.ts`, `worktree-pr-infra.ts`, `repository-mapping-store.ts`,
  `deleted-worktree-store.ts`, `worktree-ide-app-store.ts`。

### UI

- ユースケース呼び出し、状態管理、表示制御を行う。
- `resolveWorktreeDeckCompositionRoot()` から解決済み依存を取得してよいが、依存組み立て関数や `infrastructure` は直接呼ばない。
- 例: `worktree-deck.tsx`, `worktree-status-menu-bar.tsx`, `components/*`。

## 4. 設定・保存先の境界

- Raycast Preferences は command entrypoint で `process.env` 互換値へ反映し、実行パスとしきい値を扱う。対象は `GIT_WORKTREE_PATH`, `CODEX_HOME`, `WORKTREE_DECK_SEARCH_DAYS`, `WORKTREE_DECK_DONE_THRESHOLD_DAYS`。
- アプリ所有の JSON 状態は `~/.worktree-deck/storage` に固定する。storage の場所は Raycast Preferences で変更しない。
- Raycast LocalStorage は、一覧キャッシュや選択復元など、失敗しても主要処理を止めないキャッシュに使う。

## 5. 依存と組み立てのルール

- `domain` は他層へ依存しない。
- `application` は `domain` と `*Dependencies` のみ参照する。
- `interface-adapters` は `application` のポートに合わせて実装を組み立てる。
- `infrastructure` は外部アクセスの実装に専念する。
- 依存解決は `composition-root.ts` に集約する。
- UI で `create*Dependencies` / `create*Infra` を直接呼ばない。

## 6. 命名・公開規約

- `application` の実装ファイルは `*.usecase.ts`。
- `domain` の実装ファイルは `*.service.ts`。
- 依存ポート型は `*Dependencies`。
- 依存組み立て関数は `create*Dependencies`。
- 外部実装型は `*Infra`。
- `interface-adapters/*-dependencies.ts` の公開関数は原則 `create*Dependencies` / `create*Infra` のみにする。
- 関数公開は object export（`*Usecase` / `*Service`）を基本とする。

## 7. 継続方針

- 新規機能は `domain` → `application` → `interface-adapters` → `infrastructure` の順で責務を分離して追加する。
- UI ではユースケース呼び出しと表示責務に限定し、外部アクセス処理を追加しない。
- 依存逆流を防ぐため、層制約テストを常に維持する。
- `lib` の互換 wrapper は新規追加せず、残存 wrapper は利用箇所が無くなり次第削除する。

## 8. 変更時チェックリスト

- 追加/変更したファイルの責務が層定義に一致している。
- `application` が具体実装に依存していない。
- UI が `infrastructure` を直接 import していない。
- 依存組み立てが `composition-root.ts` に集約されている。
- 層制約テストとユースケーステストが通過している。
