# Issue #26: README のトラブルシュート/FAQ を Wiki に移し、動線を張る

## Context

- Issue #26: 「README のトラブルシュートや FAQ といった docs を wiki に移動」「README では wiki への動線を張る」
- README.md (151 行) には `## タブ URL の取得方法` (L119-124) と `## トラブルシュート` (L126-150) が直書き
- `docs/FAQ.md` (311 行、Q1〜Q8) はリポにあるが README から動線なし
- GitHub Wiki は repo 設定で有効 (`hasWikiEnabled: true`) だが、ページ未作成
- ゴール: 長尺のトラブルシュート/FAQ + 機構説明を Wiki に逃がし、README は「使い方とセットアップ」に集中させる

## 方針 (ユーザー確定済み)

| 項目 | 確定内容 |
|---|---|
| README から移すスコープ | `## トラブルシュート` + `## タブ URL の取得方法` の両方 |
| Wiki ページ投入手段 | **`wiki.git` を使う** (gh cli/gh api では wiki ページを直接編集できないことが調査で判明したため) |
| `docs/FAQ.md` の扱い | Wiki 投入が済んだら**同 PR 内で削除** (Wiki を single source of truth に) |

`gh cli` は PR 作成 (`gh pr create`) と issue 確認 (`gh issue view`) に使う。Wiki ページの編集は git push 経由。

## 実装手順

### Step 0. Wiki の初期ページ作成 — ✅ 完了済み

GitHub Wiki がページゼロの状態だと `wiki.git` 自体が存在せず clone が 404 になる罠があるが、ユーザーが既に Web UI で `Home` ページを作成済み (commit `6d25773` "Initial Home page")。clone 可能な状態。

### Step 1. wiki.git で 3 ページを push (Home は上書き、他は新規)

clone は既に完了済み。作業ディレクトリ: `/Users/s02836/ghq/github.com/peinan/raycast-linknote-slack.wiki/` (ghq 流の隣接配置)。

現状: `Home.md` が `# Link Note Wiki` の 1 行のみ存在。これを本格的な内容で上書きし、`Troubleshooting.md` と `FAQ.md` を新規作成する。

| ファイル | 操作 | 内容 |
|---|---|---|
| `Home.md` | **上書き** | サイドバー兼トップページ。Troubleshooting / FAQ への内部リンクと簡単なリポ説明 |
| `Troubleshooting.md` | 新規 | 現 README L119-124 (`## タブ URL の取得方法`) + L126-150 (`## トラブルシュート`) を結合 + 見出しを `# Troubleshooting` に揃える |
| `FAQ.md` | 新規 | 現 `docs/FAQ.md` の中身そのまま (先頭の `# FAQ` 含む) |

`Home.md` 例:

```markdown
# Link Note Wiki

ブラウザのアクティブタブを Slack に投げる Raycast 拡張のドキュメント置き場。

- [Troubleshooting](./Troubleshooting) — エラー別の対処
- [FAQ](./FAQ) — セットアップ詳細・Browser Extension・Publish 手順

リポ本体: [peinan/raycast-linknote-slack](https://github.com/peinan/raycast-linknote-slack)
```

commit & push:

```bash
git add Home.md Troubleshooting.md FAQ.md
git commit -m "Add Home, Troubleshooting, FAQ pages (migrated from README and docs/)"
git push origin master  # wiki.git のデフォルトブランチは master
```

push 後、GitHub の Web UI でページが 3 つ揃っていることを目視。

### Step 2. リポ本体側を編集 (PR 用ブランチ)

新ブランチで以下:

#### 2-1. README.md

- **削除**: L119-150 全体 (`## タブ URL の取得方法` 〜 `## トラブルシュート` 末尾)
- **追加**: 末尾に Wiki 動線セクション

```markdown
## ドキュメント

- [Troubleshooting](https://github.com/peinan/raycast-linknote-slack/wiki/Troubleshooting) — `not_in_channel` / `invalid_auth` などエラー別の対処
- [FAQ](https://github.com/peinan/raycast-linknote-slack/wiki/FAQ) — Slack App セットアップの詳細、AppleScript vs Browser Extension、Publish 手順 など
```

「タブ URL の取得方法」の AppleScript 解説は `docs/FAQ.md` の Q1/Q5/Q6 で網羅されているため、README から削っても情報損失なし (= Wiki 上でも FAQ 経由で完全に到達できる)。

#### 2-2. docs/FAQ.md

**削除**。`docs/` ディレクトリ自体も空になるため `git rm -r docs/` で除去する。

#### 2-3. CHANGELOG.md (任意)

`Unreleased` セクションがあるなら 1 行追記:

```markdown
- docs: move Troubleshooting and FAQ from README/docs to GitHub Wiki (#26)
```

### Step 3. PR 作成

```bash
gh pr create \
  --title "docs: move Troubleshooting and FAQ to Wiki (fix #26)" \
  --body "$(cat <<'EOF'
## Summary
- README から `## トラブルシュート` と `## タブ URL の取得方法` を削除
- README 末尾に Wiki Troubleshooting / FAQ への動線リンクを追加
- docs/FAQ.md は Wiki に移行済みのため削除

Wiki 側 (peinan/raycast-linknote-slack.wiki) には `Home`, `Troubleshooting`, `FAQ` の 3 ページを別途 push 済み。

Closes #26

## Test plan
- [ ] README をローカルプレビュー、Wiki への 2 リンクがリンク切れせず開けることを確認
- [ ] https://github.com/peinan/raycast-linknote-slack/wiki/Troubleshooting / .../FAQ が表示されることを確認
- [ ] PR マージ後 issue #26 が自動クローズされることを確認
EOF
)"
```

## 変更ファイル一覧

リポ本体 PR:

- `README.md` — L119-150 削除 + 末尾に Wiki 動線セクション追加
- `docs/FAQ.md` — 削除
- (`docs/` ディレクトリ自体も空になるので除去)
- `CHANGELOG.md` — 1 行追記 (Unreleased がある場合のみ)

Wiki 側 (別リポジトリ `*.wiki.git`):

- `Home.md` (新規)
- `Troubleshooting.md` (新規、README からの移植)
- `FAQ.md` (新規、`docs/FAQ.md` からの移植)

## 検証

1. **Wiki 表示確認**: 3 ページが GitHub Web UI で開けて、`Home` から各ページに遷移できる
2. **README プレビュー**: VS Code or `gh markdown-preview` で README の Wiki リンクをホバー → URL が正しい
3. **リンク切れチェック**: README 内の他のアンカーリンク (例: `[メッセージテンプレートを編集する](#メッセージテンプレートを編集する)` L16) が削除セクションを参照していないことを確認
   - L16 は `#メッセージテンプレートを編集する` (L88) を参照しているのでセーフ
   - 念のため `rg '\(#' README.md` で全アンカー走査
4. **lint/format**: `npm run lint` (eslint) は src/ のみ対象なので影響なし、prettier が markdown を整形する設定なら `npx prettier --check README.md`
5. **issue 自動クローズ**: PR マージ後 `gh issue view 26` で `state: CLOSED` を確認

## 想定リスク・補足

- Wiki が空 → wiki.git 404 の罠は Step 0 でユーザーに 1 ページ手動作成を依頼することで回避
- Wiki と README/docs の二重管理リスクは、`docs/FAQ.md` を同 PR で削除することで Wiki を single source of truth にして解消
- 将来「Wiki 編集を PR レビュー対象にしたい」と思ったら、`docs/` を再導入して GitHub Actions で wiki.git に同期する構成 (例: `Andrew-Chen-Wang/github-wiki-action`) に移行できる。今回はやらない
