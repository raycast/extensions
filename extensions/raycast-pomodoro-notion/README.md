# Raycast Pomodoro Notion

Raycast 上でポモドーロタイマーを動かし、作業ログを Notion に残す拡張です。  
作業 BGM・休憩 BGM・アラーム、作業メモ、集中度の記録、途中終了、一時停止・再開までを 1 つにまとめています。

> **対応 OS: macOS 専用**  
> Raycast 本体は Windows 版もありますが、この拡張は **macOS 上の Raycast** 向けです。BGM 再生など OS 依存の機能があるため、Windows では利用できません。

**作者:** [こひなだまこと](https://x.com/pgp_workstyle)

## 何ができるか

- 作業・短休憩・長休憩のポモドーロサイクル
- 作業中と休憩中で異なる BGM のループ再生（BGM は好みのファイルに変更可能）
- セッション終了時のアラーム
- 作業メモと集中度（高 / 中 / 低）の入力
- Notion データベースへの作業ログ保存
- 一時停止・再開を除いた **実作業時間** の記録
- 作業中・休憩中それぞれの途中終了

## English Summary

Raycast Pomodoro Notion is a **macOS-only** Raycast extension that combines a Pomodoro timer with Notion logging.  
Created by [こひなだまこと](https://x.com/pgp_workstyle).

After installation, set up a Notion database and extension preferences, then start from **Start Pomodoro** or **Pomodoro Status**.  
Features include work / short break / long break cycles, bundled BGM (replaceable in preferences), pause and resume, early finish, and logging each work session with note, focus level, start time, end time, and actual active minutes.

The `Time` field is saved as a number calculated by the extension (excluding paused time), ready for Notion charts and dashboards.

Default cycle: 37 minutes work, 3 minutes short break, 15 minutes long break after every 3 completed work sessions. All values are configurable in Raycast preferences.

## 想定ユーザー

- **macOS** で Raycast を日常的に使っている人
- 作業ログを Notion に残したい人
- タイマーだけでなく、あとで振り返れる記録が欲しい人
- BGM 付きで作業と休憩を切り替えたい人

## 必要なもの

- **Raycast**（macOS）
- **Notion** アカウント（**作業ログ保存は無料プランで可**。Dashboard の複数 chart 表示は **Notion Plus 以上を推奨** — 下記参照）
- 作業ログ用 Notion データベース（**推奨:** [Minimal テンプレート](https://steady-lighter-6fe.notion.site/Raycast-Pomodoro-Notion-Dashboard-Minimal-adbcd1874cd583ff8e8b815edee6f829)を Duplicate）

## クイックスタート

インストール後、次の 3 ステップで使い始められます。

1. Notion で [**Minimal テンプレート**](https://steady-lighter-6fe.notion.site/Raycast-Pomodoro-Notion-Dashboard-Minimal-adbcd1874cd583ff8e8b815edee6f829)（`Raycast Pomodoro Notion Dashboard（Minimal）`）を **Duplicate** するか、同等の **作業ログ** データベースを手動で用意する
2. Raycast で **`Configure Notion`** を開き、`Notion Token`（コネクトのアクセストークン）と `Notion Database ID` を設定して接続を確認する
3. **`Start Pomodoro`** または **`Pomodoro Status`** からセッションを開始する

テンプレート利用時は、Duplicate 先の **「はじめに」** に沿ってコネクト接続とデータベース ID の取得まで進めてください。手順の詳細は **Notion セットアップ** を参照。

### デフォルト設定

- 作業: 37 分
- 短休憩: 3 分
- 長休憩: 15 分
- 長休憩の間隔: 3 セットごと
- 作業種類（`Session Type`）: `メイン作業` / `執筆` / `読書` / `雑務`

タイマー長・音量・BGM などは Raycast → 拡張 **Preferences**（設定）から変更できます。

## 1日の使い方（概要）

1. **Start Pomodoro** または **Pomodoro Status** から **作業種類** を選んで開始
2. 作業中 … 作業 BGM がループ（設定・音量による）
3. 作業終了 … タイマー満了、または **今の作業を終了**
4. **作業メモ** と **集中度** を入力して Notion に保存
5. **短休憩** または **長休憩** へ自動で進む
6. 休憩後、次の **作業種類** を選んで再開

**振り返り:** Notion の Dashboard（今週のチャート）や **作業ログ** DB の **今日** / **今週** ビューで確認できます。休憩は Notion に記録されません。Dashboard の chart が無料プランで表示されない場合は、**作業ログ** DB のビューを使ってください（**Notion 無料プランと Dashboard** 参照）。

## 使えるコマンド

Raycast のコマンドパレットで次の名前を検索してください。

| コマンド | 用途 |
|---|---|
| **Start Pomodoro** | 新しい作業セッションを開始 |
| **Pause Pomodoro** | 現在のセッションを一時停止 |
| **Resume Pomodoro** | 一時停止中のセッションを再開 |
| **Finish Current Session** | 現在の作業または休憩を終了して次へ進む |
| **Discard Session** | 作業中は Notion に保存してから停止 / 休憩中は保存せず停止 |
| **Pomodoro Status** | 状態確認、一時停止・再開、作業ログ入力、途中終了、タイマー・作業種類の編集 |
| **Configure Notion** | Notion 接続の確認とデータベース設定の検証 |

## 同梱音源

デフォルトで次の BGM・アラームが同梱されています。

| 用途 | 内容 | 出典 |
|---|---|---|
| 作業中 | 雨音（ループ） | [Pixabay — Nature copyright free rain sounds](https://pixabay.com/sound-effects/nature-copyright-free-rain-sounds-331497/) |
| 休憩中 | ピアノ（ループ） | [Pixabay — Musical the last piano](https://pixabay.com/sound-effects/musical-the-last-piano-112677/) |
| 満了時 | ベル | [Pixabay — Film special effects bell fx](https://pixabay.com/sound-effects/film-special-effects-bell-fx-410608/) |

いずれも [Pixabay](https://pixabay.com/) から取得した効果音です（[Pixabay Content License](https://pixabay.com/service/license-summary/) に基づく利用）。

Raycast → 拡張 **Preferences** の `Work Sound File` / `Break Sound File` / `Alarm Sound File` で、お好みの音声ファイルに差し替えできます。

## Notion セットアップ

作業ログの保存先として、Notion データベース **1 つ** が必要です。  
**推奨** は、Notion 上で公開している Minimal テンプレート [**Raycast Pomodoro Notion Dashboard（Minimal）**](https://steady-lighter-6fe.notion.site/Raycast-Pomodoro-Notion-Dashboard-Minimal-adbcd1874cd583ff8e8b815edee6f829) を Duplicate する方法です（Dashboard・作業ログ DB・セットアップガイド「はじめに」が含まれます）。Raycast 拡張本体には Notion テンプレートは含まれません。

**Duplicate リンク:** https://steady-lighter-6fe.notion.site/Raycast-Pomodoro-Notion-Dashboard-Minimal-adbcd1874cd583ff8e8b815edee6f829

### テンプレートに含まれるもの（Minimal）

| 要素 | 内容 |
|---|---|
| Dashboard（トップ） | 今週サマリーのチャート 3 枚（日別作業時間 / 作業種類 / 集中度） |
| **作業ログ** DB | 拡張連携先。ビュー（すべて / 今日 / 今週）とチャート 2 枚 |
| **はじめに** | Notion 上のセットアップガイド |

> **Notion 無料プランと Dashboard**  
> Raycast 拡張による **作業ログの保存**（`Configure Notion`・DB への書き込み）は、Notion **無料プラン** でも利用できます。  
> 一方、Minimal テンプレの **Dashboard（トップ）** は **chart ビューを 3 枚並べた構成** です。Notion **無料プラン** では **1 ページに表示できる chart の数に制限** があり、Dashboard 上の chart が **すべて表示されない** ことがあります（テンプレ全体では Dashboard 3 枚＋作業ログ DB 内 chart 2 枚）。  
> **無料プラン** では **作業ログ** DB の **今日** / **今週** テーブルビューで振り返る運用を想定してください。Dashboard をフルに使う場合は **Notion Plus（有料）以上** を推奨します。

テンプレート利用時の流れ:

1. [Minimal テンプレート](https://steady-lighter-6fe.notion.site/Raycast-Pomodoro-Notion-Dashboard-Minimal-adbcd1874cd583ff8e8b815edee6f829)を開き **Duplicate** して自分のワークスペースにコピーする
2. 下記 **1〜5** の手順（コネクト作成 → DB 接続 → データベース ID 取得 → Raycast 設定）を行う  
   ※ 詳細は Duplicate 先の **「はじめに」** を参照
3. `Configure Notion` で接続確認が成功することを確認する

### 1. Notion コネクトを作成する

Notion の **コネクト** から **アクセストークン**（多くは `secret_…` で始まる文字列）を発行します。

**おすすめ（ブラウザ）**

1. [コネクト管理画面](https://app.notion.com/developers/connections) を開く
2. **+ 新規コネクト** をクリック
3. **名前**（例: `Raycast Pomodoro`）を入力し、**アクセストークン** と **ワークスペース** を選び、**コネクトを作成** をクリック
4. 表示された **アクセストークン** をコピー

**Notion アプリから行く場合**

1. 左サイドバー **上** の **ワークスペース名** → **設定**
2. **コネクト** タブ → 一番下の **コネクトを作成または管理する**
3. ブラウザで開いた [コネクト管理画面](https://app.notion.com/developers/connections) で、上記 **2〜4** を続ける

> アクセストークンはパスワードと同様に扱い、Raycast の **Notion Token** 以外に共有しないでください。

このアクセストークンを Raycast 側の **Notion Token** に設定します。

### 2. 作業ログ用データベースを用意する

**テンプレートを使う場合**  
Duplicate 後の **作業ログ** データベースをそのまま使います。プロパティ名・型・ビューは初期設定済みです。

**手動で作る場合**  
Notion で新しいデータベースを作成し、少なくとも以下のプロパティを **この名前・型のまま** 用意します。

| プロパティ | 型 | 補足 |
|---|---|---|
| `Name` | Title | 拡張が自動入力 |
| `Start` | Date | **Include time: ON** |
| `End` | Date | **Include time: ON** |
| `Work Note` | Text | 作業メモ（空可）。Rich text でも可 |
| `Focus` | Select | 選択肢 `高` / `中` / `低` |
| `Session Type` | Select | 下記の作業種類と **同じ文言** で選択肢を登録 |
| `Time` | Number | Formula ではなく Number |

#### `Focus`（必須選択肢）

- `高`
- `中`
- `低`

#### `Session Type`（拡張の既定＝Minimal テンプレ初期値）

拡張は Raycast 側で作業種類を管理し、保存時に `Session Type` へ書き込みます。  
**Notion の Select 選択肢と拡張の作業種類は同じ文言に揃えてください**（拡張は Notion へ選択肢を自動追加しません）。

既定の作業種類（テンプレート DB も同じ）:

- `メイン作業`
- `執筆`
- `読書`
- `雑務`

変更する場合は、Raycast の **Pomodoro Status** → **作業種類を編集** と、Notion の `Session Type` 選択肢を **両方** 更新してください。

### 3. 作業ログ DB にコネクトを接続する

1. **作業ログ** データベースページをフルページで開く
2. 右上 **⋯**（または **共有**）を開く
3. **コネクションを追加** から、手順 1 で作ったコネクトを選び **接続**

接続していないと、アクセストークンが正しくても拡張から保存できません。

### 4. データベース ID を取得する

**作業ログ** DB をフルページ表示にし、URL からデータベース ID（32 文字前後の英数字）を取得します。

- **作業ログ DB 本体** の URL を使う（「はじめに」や Dashboard の URL ではない）
- `?v=` 以降は含めない
- Duplicate 後はコピー先ごとに ID が変わるため、必ず自分の DB から取り直す

この値を Raycast 側の `Notion Database ID` に設定します。

### 5. Raycast 側で接続確認する

1. `Configure Notion` を開く
2. `Notion Token` を設定する
3. `Notion Database ID` を設定する
4. **接続を確認** を実行する
5. 必須プロパティの不足や型不一致がないことを確認する
6. `Focus` と `Session Type` の選択肢に関する表示は **警告** です。接続成功と混同しないでください

## `Time` プロパティの考え方

`Time` は **`Number` プロパティ** 前提です。  
Notion の Formula ではなく、拡張側で一時停止・再開を考慮した実作業時間を計算して直接保存します。

| プロパティ | 役割 |
|---|---|
| `Start` / `End` | 開始・終了の時刻記録 |
| `Time` | 集計用の実作業時間（一時停止分を除いた分単位の数値） |

Notion のチャートや Dashboard の集計にそのまま使えます。

## プライバシー・データの保存先

| データ | 保存先 |
|---|---|
| `Notion Token` / `Notion Database ID` | Raycast の拡張設定（Preferences）のみ |
| 進行中セッション・タイマー状態 | お使いの Mac 上の Raycast 内 |
| 作業ログ（メモ・集中度・時間など） | 設定した Notion データベース |

拡張作者のサーバーへデータを送信する仕組みはありません。

## 既知の制限

- **macOS 専用**（Windows 版 Raycast では利用不可）
- スリープ復帰時の自動一時停止は無効です。復帰後は **Pomodoro Status** で状態を確認してください
- 満了処理は Raycast / macOS の状態に依存するため、アラームや通知のタイミングがずれる場合があります
- 満了処理用の内部コマンド **Internal: Timer Elapsed** が検索結果に表示されることがあります（通常の操作では使いません）
- **Notion 無料プラン** では、Minimal テンプレの **Dashboard（chart 3 枚）** が制限により **すべて表示されない** 場合があります（拡張によるログ保存自体は可能）。詳細は **Notion セットアップ** の「Notion 無料プランと Dashboard」を参照

## 作者・ライセンス

- **こひなだまこと** — [X（@pgp_workstyle）](https://x.com/pgp_workstyle)
- Raycast Store 上の公開 ID: `hk_raycast`
- 拡張のソースコード: MIT License（Copyright (c) 2026 こひなだまこと）
- 同梱 BGM: [Pixabay Content License](https://pixabay.com/service/license-summary/)（出典は **同梱音源** を参照）
