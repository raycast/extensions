# worktree-deck ドメイン用語

最終確認日: 2026-05-25

このドキュメントは、`worktree-deck` で使う主要な言葉の意味を揃えるための用語集である。
実装ファイル名や関数名はここに書かず、コード構造が変わっても変わりにくい概念だけを扱う。

## Worktree

Git repository から切り出された作業用ディレクトリ。
`worktree-deck` では一覧の中心単位であり、repository、branch、path、作業状態、関連セッションをまとめて扱う。

## Repository

worktree の元になる Git repository。
同じ repository に属する worktree は一覧上で同じまとまりとして扱う。

## Repository Mapping

repository の実パスと、一覧表示で使う短い名前の対応。
worktree 名の解釈や repository ごとの表示グループ化に使う。

## Branch

worktree が作業対象にしている Git branch。
一覧上の表示名、merge / pull / PR 作成、base ref 推定の基準になる。

## Base Ref

worktree の作業差分を比較する基準 ref。
merge 状態、ahead / behind、PR 作成時の base branch を判断するために使う。

## Merge Status

worktree が base ref に対してどの状態にあるかを表す分類。
主な状態は、同期済み、未マージ、作業ツリー dirty、commit なし、判定不能である。

## Ahead / Behind

base ref と worktree の HEAD の差分 commit 数。
作業が base より進んでいるか、base から遅れているかを一覧で判断するために使う。

## Session

Codex などの作業ログから復元される作業単位。
worktree や repository に紐づき、タイトル、最新メッセージ、skill 利用履歴、作業中/完了、ユーザー入力待ちなどの状態を持つ。

## Review Session

レビューを目的とする session。
通常作業 session と区別し、一覧や詳細表示では重複表示や表示対象メッセージの扱いを変える。

## Display Snapshot

一覧表示に必要な worktree、repository mapping、session、Git metadata、起動アプリ情報をまとめた表示用の状態。
UI は snapshot を受け取って表示へ反映し、個別の外部 I/O 手順は直接持たない。

## Display Cache

前回表示できた snapshot 相当の情報を、次回起動時に素早く復元するための保存値。
更新中や一部の外部 I/O 失敗時でも、最後に成功した表示状態を使えるようにする。

## Open App

worktree を開く既定のアプリ。
例として IDE や Codex App があり、worktree ごとに選択状態や関連メタ情報を持つ。

## Preferred IDE

Open App が IDE を指すときに使う既定の IDE。
Zed、Cursor、VS Code のような候補から選び、worktree 作成後やファイルを開く操作の既定値になる。

## Runtime Preferences

Raycast Preferences で管理する実行時の設定。
worktree の作成先、Codex home、セッション探索期間、完了扱いのしきい値など、環境ごとに変わる値を扱う。

## Application Settings

`worktree-deck` が自分で管理するアプリ内設定。
repository mapping や preferred IDE など、Raycast Preferences ではなくアプリの操作から変える値を扱う。
