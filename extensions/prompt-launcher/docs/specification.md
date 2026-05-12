# Prompt Launcher 仕様書

## 1. 目的

`Prompt Launcher` は、Markdown ファイルとして管理しているプロンプトを Raycast から素早く呼び出すための Raycast Extension である。

既存の前提として、プロンプト本文はすでに Markdown ファイル単位で管理されている。履歴管理は Git で行われ、編集は主に Visual Studio Code で行う。したがって、本 Extension が解決する対象は「プロンプトの管理」そのものではなく、「既存の Markdown ファイルを素早く探し、選択し、コピーまたは編集できる呼び出し体験」である。

## 2. 名称

- Extension title: `Prompt Launcher`
- package name: `prompt-launcher`
- GitHub repository: `raycast-prompt-launcher`

## 2.1 Store 検索用 keywords

Raycast Store の検索で利用者が見つけやすいように、`package.json` の `keywords` は以下とする。

```json
["prompt", "prompts", "ai", "markdown", "clipboard", "snippet"]
```

各 keyword の位置づけは以下とする。

| keyword     | 位置づけ                                     |
| ----------- | -------------------------------------------- |
| `prompt`    | Extension の主対象であるプロンプト           |
| `prompts`   | 複数形で検索する利用者向け                   |
| `ai`        | AI 用プロンプト管理という利用文脈            |
| `markdown`  | 既存 Markdown ファイルをそのまま使う管理形式 |
| `clipboard` | 選択した Markdown 本文をコピーする主要操作   |
| `snippet`   | 短い再利用テキストを探してコピーする近い用途 |

## 2.2 README 方針

公開用 README は、Raycast Store で利用者が Extension の概要、初期設定、使い方、データの扱いを確認するための文書とする。

README 本体には、Raycast Store 公開時に利用者が迷わず正しく利用するために必要な内容を記載する。

README から参照する画像は `media` 配下で管理する。Raycast `Window Capture` が作成する Store 用スクリーンショットは `metadata` 配下に保存されるため、README に掲載する画像は `metadata/prompt-launcher-1.png` から `media/prompt-launcher-1.png` へ同期する。

公開素材と補助資産の保存先は以下の役割で分離する。

| フォルダ       | 役割                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| `assets/`      | Extension 実行時に参照する icon などの runtime asset                                 |
| `metadata/`    | Raycast `Window Capture` が `Save to Metadata` で作成する Store 用スクリーンショット |
| `media/`       | README から直接参照する画像                                                          |
| `docs/assets/` | ドキュメントや撮影手順の補助資産                                                     |

README 用画像の同期は `npm run sync:readme-media` で実行する。

ローカル開発、デモデータ、公開前確認、GitHub Release、Raycast Store publish、Store スクリーンショット撮影の手順は README 本体に詳細を記載せず、専用ドキュメントへの参照に分離する。

参照先は以下とする。

- `docs/local-verification.md`
- `docs/release-management.md`
- `docs/store-screenshots.md`

## 2.3 アイコンセット定義

公開用アイコンは、`Prompt Launcher` の主要機能である「既存の Markdown プロンプト群から選択し、クリップボードへコピーする」ことを表現する。

アイコンは Raycast Store 公開要件に合わせて、`assets/icon.png` として `512 x 512` pixel の PNG で配置する。

アイコン生成元は `scripts/generate-icon.mjs` とする。`npm run icon:generate` はまず `assets/icon.generated.png` を生成する。`assets/icon.png` は自動では上書きしない。

`npm run icon:generate` は、生成後に `assets/icon.png` へ反映するかを確認する。`yes` と入力した場合だけ `assets/icon.generated.png` を `assets/icon.png` へ上書きし、反映後に `assets/icon.generated.png` を削除する。`yes` 以外の場合は `assets/icon.png` を変更せず、確認用の `assets/icon.generated.png` を残す。

非対話環境では、`npm run icon:generate -- --yes` または `node scripts/generate-icon.mjs --yes` を実行した場合だけ確認を省略して `assets/icon.png` へ反映する。`npm run icon:generate -- --no` または `node scripts/generate-icon.mjs --no` を実行した場合は確認を省略し、`assets/icon.png` を変更せず `assets/icon.generated.png` を残す。

`assets/icon.generated.png` は確認用の生成物であり、Git 管理対象外とする。生成されたアイコンは、以下のアイコンセット定義に照らして目視確認する。Raycast 公開 Extension としての icon criteria は、GitHub Actions の `Build` workflow で実行する `npm run lint`、つまり `ray lint` で確認する。

採用するモチーフは以下とする。

- 背景は `docs/assets/autumnal-peach.png` と調和する peach、coral、lavender 系の明るい gradient とする
- 前面には cream または ivory の one large prompt card または document を配置する
- 背面には `Prompt Set` を示す 2 から 3 枚の pale peach または pale lavender の stacked cards を配置する
- 右下または corner には dark plum または deep indigo の clipboard を配置する
- Markdown の示唆は、小さな `#` または本文 lines に留める
- 大きな `MD` text は使わない

避けるモチーフは以下とする。

- folder 単体
- library または bookshelf
- AI sparkle、brain、chat bot など AI 生成機能を強く連想させるもの
- rocket 単体
- 大きな `MD` text

## 2.4 Store スクリーンショット定義

Raycast Store 公開用スクリーンショットは、Raycast の `Window Capture` 機能で作成する。

撮影方法、背景、撮影対象画面、確認項目は `docs/store-screenshots.md` を正とする。

スクリーンショット背景は `docs/assets/autumnal-peach.png` を使用する。

Store 用スクリーンショットでは、すべての画像で同じ背景、同じ theme、同じ撮影方法を使用する。

初期公開では、少なくとも以下の 3 枚を作成する。

| 番号 | Command           | 画面状態                                                                                                                                                                                                                                                                                                                                                                                                  | 目的                                                                                                        |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | `Prompt Set 1`    | `Prompt Set 1` が開いている。preview pane が表示されている。Markdown ファイル `blog-outline.md` が選択されている。detail pane には本文プレビューと metadata table が表示されている。metadata table には `Prompt Set`、`Relative Path`、`Size`、`Updated`、`Full Path` が表示されている。画面下部の primary action は `Copy Raw Content` である。                                                          | 既存 Markdown ファイルを選択して内容を確認できることを示す                                                  |
| 2    | `Prompt Set 1`    | Action Panel が開いている。Action Panel の選択行は `Copy Expanded Content` である。画面下部の primary action は `Copy Raw Content` である。Action Panel には上から順に `Copy Expanded Content`、`Hide Preview`、ファイルを開く Action、`Open with…`、`Show in Finder` が表示されている。ファイルを開く Action は、`Editor` preference が未設定の場合は `Open`、設定済みの場合は `Open in Editor` である。 | そのままコピー、Dynamic Placeholders 展開後コピー、プレビュー切り替え、ファイルを開く操作を選べることを示す |
| 3    | `All Prompt Sets` | `All Prompt Sets` が開いている。複数 Prompt Set の section が表示されている。少なくとも `prompt-set-2` と `prompt-set-1` の section が表示されている。Markdown ファイル `all-placeholders.md` が選択されている。detail pane には本文プレビューと metadata table が表示されている。画面下部の primary action は `Copy Raw Content` である。                                                                | 複数 Prompt Set を横断検索できることを示す                                                                  |

README に掲載する画像は、Store 用スクリーンショット 1 枚目の `metadata/prompt-launcher-1.png` を元にする。撮影後は `npm run sync:readme-media` を実行し、`media/prompt-launcher-1.png` を更新する。

## 3. 背景と経緯

当初の要件では、複数の固定フォルダを個別ショートカットで呼び出したいという希望があった。

Raycast では、グローバルホットキーは Command 単位で設定する運用になる。そのため、フォルダごとに直接ホットキーを割り当てたい場合は、フォルダごとに Command を用意する設計が適している。

ただし、`All Prompt Sets` が `Prompt Set 1` から `Prompt Set 3` と同じフォルダ設定を確実に参照できるようにするため、対象フォルダの設定値は Command 個別設定ではなく Extension 共通設定として管理する。各 Command は、Extension 共通設定の `Prompt Set 1` から `Prompt Set 3` のうち、自分に対応する slot を参照する。

一方で、Command 数を増やしすぎると Raycast の root search や Extensions 設定画面でノイズが増える。初期案として `Prompt Set 1` から `Prompt Set 10` までを用意する案も検討したが、10個は初期実装として多く、利用者が覚えるショートカット数としても過剰である。

そのため、最終方針として以下の構成を採用する。

- よく使うフォルダは `Prompt Set 1` から `Prompt Set 3` の個別 Command で直接呼び出す
- それ以外、または場所が曖昧な Markdown ファイルは `All Prompt Sets` で横断検索する

この構成により、頻繁に使うフォルダへの最短アクセスと、全体検索の柔軟性を両立する。

## 4. 基本方針

本 Extension は、既存の Markdown ファイルを読み取り、コピーやファイルを開く操作を支援する。

既存の Markdown ファイルを読み取り、一覧表示し、選択したファイルに対して以下の操作を提供する。

- ファイル内容を丸ごとクリップボードにコピーする
- ファイル内容内の Dynamic Placeholders を置換してクリップボードにコピーする
- 選択中の Markdown ファイルの冒頭プレビューを表示する
- `Editor` が設定済みの場合は、指定エディタでファイルを開く
- `Editor` が未設定の場合は、既定アプリでファイルを開く
- 任意の対応アプリでファイルを開く
- Finder でファイルを表示する

本 Extension は Markdown ファイルを新規作成、編集、リネーム、移動、削除しない。Git 操作やクラウド同期も実行しない。

## 5. Command 構成

初期実装では、以下の4つの Command を提供する。

| Command           | 用途                                               |
| ----------------- | -------------------------------------------------- |
| `Prompt Set 1`    | 高頻度フォルダ1を直接開く                          |
| `Prompt Set 2`    | 高頻度フォルダ2を直接開く                          |
| `Prompt Set 3`    | 高頻度フォルダ3を直接開く                          |
| `All Prompt Sets` | 有効かつ設定済みの Prompt Set 全体から横断検索する |

## 6. Prompt Set 1 から Prompt Set 3 の仕様

### 6.1 目的

`Prompt Set 1` から `Prompt Set 3` は、特定のプロンプトフォルダを個別ショートカットで直接呼び出すための Command である。

### 6.2 設定項目

対象フォルダは、Extension 共通設定として `Prompt Set 1` から `Prompt Set 3` までを持つ。

Raycast Preferences 上では、各 Prompt Set の checkbox preference の `title` を `Prompt Set N`、`label` を `Enable Prompt Set N` とする。これにより、`Prompt Set N` を区切り見出しとして表示し、その直下に対象 Prompt Set の有効化、Folder、Name を並べる。

```text
Prompt Launcher Preferences
├── Prompt Set 1
│   ├── Enable Prompt Set 1
│   ├── Prompt Set 1 Folder
│   └── Prompt Set 1 Name
├── Prompt Set 2
│   ├── Enable Prompt Set 2
│   ├── Prompt Set 2 Folder
│   └── Prompt Set 2 Name
├── Prompt Set 3
│   ├── Enable Prompt Set 3
│   ├── Prompt Set 3 Folder
│   └── Prompt Set 3 Name
└── Shared Preferences
    ├── Editor
    ├── Preview Line Count
    └── Preview Max Characters
```

| Prompt Set 区切り | 設定項目            | 種別      | 必須 | 初期値 | 説明                                                            |
| ----------------- | ------------------- | --------- | ---: | ------ | --------------------------------------------------------------- |
| Prompt Set 1      | Enable Prompt Set 1 | checkbox  | 任意 | `true` | `Prompt Set 1` を有効化し、`All Prompt Sets` の検索対象に含める |
| Prompt Set 1      | Prompt Set 1 Folder | directory | 任意 | なし   | `Prompt Set 1` が参照する対象 Markdown フォルダ                 |
| Prompt Set 1      | Prompt Set 1 Name   | textfield | 任意 | なし   | `Prompt Set 1` および `All Prompt Sets` 内で表示するフォルダ名  |
| Prompt Set 2      | Enable Prompt Set 2 | checkbox  | 任意 | `true` | `Prompt Set 2` を有効化し、`All Prompt Sets` の検索対象に含める |
| Prompt Set 2      | Prompt Set 2 Folder | directory | 任意 | なし   | `Prompt Set 2` が参照する対象 Markdown フォルダ                 |
| Prompt Set 2      | Prompt Set 2 Name   | textfield | 任意 | なし   | `Prompt Set 2` および `All Prompt Sets` 内で表示するフォルダ名  |
| Prompt Set 3      | Enable Prompt Set 3 | checkbox  | 任意 | `true` | `Prompt Set 3` を有効化し、`All Prompt Sets` の検索対象に含める |
| Prompt Set 3      | Prompt Set 3 Folder | directory | 任意 | なし   | `Prompt Set 3` が参照する対象 Markdown フォルダ                 |
| Prompt Set 3      | Prompt Set 3 Name   | textfield | 任意 | なし   | `Prompt Set 3` および `All Prompt Sets` 内で表示するフォルダ名  |

以下の設定は、すべての Prompt Set に共通で適用する。

| 設定項目               | 種別      | 必須 | 初期値 | 説明                                                                |
| ---------------------- | --------- | ---: | ------ | ------------------------------------------------------------------- |
| Editor                 | appPicker | 任意 | なし   | Markdown ファイルを開く共通エディタ。未設定の場合は既定アプリで開く |
| Preview Line Count     | textfield | 任意 | `10`   | プレビューに表示する冒頭行数                                        |
| Preview Max Characters | textfield | 任意 | `4000` | プレビューの最大文字数                                              |

各 directory は任意設定とする。これは、利用者が3つすべての Prompt Set を必ず使うとは限らないためである。

`Enable Prompt Set N` が無効の場合、その Prompt Set は個別 Command でも `All Prompt Sets` でも Markdown ファイルを読み込まない。フォルダ設定値が残っていても、有効化されるまで参照対象に含めない。

`Enable Prompt Set N` が有効で、対応する Prompt Set Folder が未設定の場合は、設定を促す画面を表示する。

### 6.3 表示対象

有効な Prompt Set の対象フォルダ配下で、拡張子が `.md` の Markdown ファイルを大文字小文字を区別せずに再帰的に一覧表示する。

対象となる拡張子の例は以下である。

- `.md`
- `.MD`
- `.Md`
- `.mD`

以下は初期実装では除外する。

- `.git` 配下
- `node_modules` 配下
- 隠しディレクトリ配下
- 拡張子が `.md` ではないファイル。大文字小文字は区別しない

### 6.4 表示内容

一覧では、各 Markdown ファイルについて以下を表示する。

- ファイル名
- 親ディレクトリ
- 更新日時
- ファイルサイズ

ただし、プレビュー表示が有効な場合は Raycast の list detail 表示により一覧側の横幅が狭くなるため、一覧側の情報密度を調整する。

プレビュー表示が無効な場合は、一覧側に以下を表示する。

- ファイル名
- 親ディレクトリ
- 更新日時
- ファイルサイズ

一覧の更新日時は Raycast の自動 date 表示に任せず、比較しやすい固定形式 `YYYY/MM/DD HH:mm` の文字列として accessory に表示する。秒は一覧では表示しない。

一覧 accessory は `更新日時 / ファイルサイズ` の順で表示する。

親ディレクトリは、対象フォルダからの相対パスに親ディレクトリが存在する場合のみ subtitle として表示する。対象フォルダ直下のファイルでは、ファイル名と同じ情報が重複しないように subtitle を表示しない。

detail pane の metadata では、ファイルサイズと OS ロケールに従った詳細な日時を表示する。

フォルダ名は、単一フォルダ Command では一覧 item に表示しない。`All Prompt Sets` では section title としてフォルダ名を表示するため、各 item では同じフォルダ名を繰り返し表示しない。

一覧の表示順は、検索バー右側の `Sort` dropdown で明示的に切り替えられるようにする。

Sort dropdown の選択肢は以下とする。

| Sort                   | 説明                             |
| ---------------------- | -------------------------------- |
| Updated (Newest First) | 更新日時が新しい順。初期値       |
| Updated (Oldest First) | 更新日時が古い順                 |
| Name (A-Z)             | ファイル名の昇順                 |
| Path (A-Z)             | 対象フォルダからの相対パスの昇順 |

Sort dropdown は `storeValue` を有効にし、利用者が最後に選択した sort を Raycast 側に記憶させる。

`All Prompt Sets` ではフォルダごとの section は維持し、section 内の Markdown ファイルだけを選択中の sort に従って並べ替える。

プレビュー表示が有効な場合は、一覧側を検索と選択に必要な情報へ絞る。

- title にはファイル名を表示する
- subtitle には親ディレクトリが存在する場合のみ親ディレクトリを表示する
- accessories は表示しない
- ファイルサイズ、更新日時、完全パスなどの補助情報は detail pane の metadata に表示する

この方針により、プレビュー表示時に狭くなった一覧側で title、subtitle、accessories が競合して読みにくくなることを避ける。

### 6.5 主操作

選択した Markdown ファイルの内容を、元の内容のままクリップボードにコピーする。

### 6.6 プレビュー表示

プレビュー表示が有効な場合、Markdown ファイル一覧の右側 detail pane に、選択中ファイルの冒頭プレビューを表示する。

プレビューは一覧作成時には読み込まない。表示速度を維持するため、選択中の List Item だけが必要になった時点でファイル冒頭を読み込む。

プレビュー表示が無効な場合、従来通り detail pane は表示しない。

プレビュー表示の有効・無効は、Raycast Preferences ではなく Action Panel の単一トグル Action で切り替える。

- プレビュー表示中の Action 名は `Hide Preview` とする
- プレビュー非表示中の Action 名は `Show Preview` とする
- `LocalStorage` に保存済みの表示状態が存在しない初回起動時は、プレビュー表示有効を既定値とする
- 切り替えた状態は `LocalStorage` に保存し、次回以降の Command 起動時は保存済みの最後の状態を復元する

この方式により、Raycast Preferences の反映タイミングに依存せず、Command 内で即時に表示状態を切り替えられるようにする。

プレビューは `Preview Line Count` と `Preview Max Characters` の小さい方の制限に従って切り詰める。

プレビュー本文には、利用者が設定済みで理解している `Preview Line Count` や `Preview Max Characters` の説明文を表示しない。プレビュー本文はファイル名と Markdown 本文の冒頭に集中させる。

選択中ファイルに関係する補助情報は、detail pane の metadata として表示する。

- Prompt Set
- Relative Path
- Size
- Updated
- Full Path

metadata は本文プレビューとは分離して表示し、本文確認とファイル属性確認の役割を分ける。

### 6.7 副操作

選択した Markdown ファイルに対して、以下の副操作を提供する。

- `Copy Raw Content` で内容をそのままクリップボードにコピーする。先頭 Action として表示し、Enter で実行できる状態を維持する
- `Copy Expanded Content` で内容内の対応表に記載した Dynamic Placeholders を置換してクリップボードにコピーする
- プレビュー表示を `Show Preview` / `Hide Preview` の単一 Action で切り替える。ショートカットは Raycast の `ToggleQuickLook` common shortcut とする
- `Editor` が設定済みの場合は、`Open in Editor` で指定エディタで開く
- `Editor` が未設定の場合は、`Open` で既定アプリで開く
- 任意の対応アプリで開く
- Finder で表示する

`Open in Editor` と `Open` は同時には表示しない。`Editor` が設定済みの場合は `Open in Editor` を表示し、`Editor` が未設定の場合は `Open` を表示する。

通常の Markdown ファイル選択時の Action Panel には、設定を開く Action は表示しない。設定を開く Action は、Prompt Set 無効、Prompt Set Folder 未設定、有効な Prompt Set の設定済みフォルダの読み込み失敗、または Markdown ファイルが存在しない空状態など、設定確認が必要な画面で表示する。

Action Panel に表示する Action は、アイコン表示の有無が混在しない状態にする。

独自 Action はアイコンを明示指定する。Raycast 標準 Action は、標準の既定アイコンが操作内容と一致する場合は既定アイコンを維持する。標準の既定アイコンでは操作の区別が弱い場合は、操作内容に合うアイコンを明示指定する。

Action icon は以下とする。

| Action                       | icon                                 |
| ---------------------------- | ------------------------------------ |
| `Copy Raw Content`           | `Icon.Clipboard`                     |
| `Copy Expanded Content`      | `Icon.Replace`                       |
| `Show Preview`               | `Icon.Eye`                           |
| `Hide Preview`               | `Icon.EyeDisabled`                   |
| `Open in Editor`             | `Icon.Pencil`                        |
| `Open`                       | `Icon.Document`                      |
| `Open with…`                 | `Action.OpenWith` の既定アイコン     |
| `Show in Finder`             | `Action.ShowInFinder` の既定アイコン |
| `Open Extension Preferences` | `Icon.Gear`                          |

## 7. All Prompt Sets の仕様

### 7.1 目的

`All Prompt Sets` は、有効かつ設定済みのすべての Prompt Set から Markdown ファイルを横断検索するための Command である。

個別フォルダのショートカットではなく、全体から探すための入口として機能する。

### 7.2 対象フォルダ

以下のうち、`Enable Prompt Set N` が有効で、Prompt Set Folder が設定済みのものを対象とする。

- `Prompt Set 1`
- `Prompt Set 2`
- `Prompt Set 3`

無効化されている Prompt Set、または Prompt Set Folder が未設定の Prompt Set は横断検索対象に含めない。

### 7.3 表示方法

`All Prompt Sets` では、Markdown ファイルをフォルダ単位で分類して表示する。

例:

```text
Work Prompts
  review.md
  refactor.md

Personal Prompts
  daily.md
  memo.md

Blog Prompts
  outline.md
  title.md
```

### 7.4 操作

各 Markdown ファイルに対して、`Prompt Set 1` から `Prompt Set 3` と同じ操作を提供する。

- 内容をそのままクリップボードにコピーする
- 内容内の対応表に記載した Dynamic Placeholders を置換してクリップボードにコピーする
- `Editor` が設定済みの場合は `Open in Editor` で指定エディタで開く
- `Editor` が未設定の場合は `Open` で既定アプリで開く
- 任意の対応アプリで開く
- Finder で表示する

## 8. Dynamic Placeholders 仕様

### 8.1 基本方針

Prompt Launcher は、Raycast Dynamic Placeholders と同じ名前の placeholder の一部と、Prompt Launcher 独自の `{timezone}` および `{now}` をサポートする。Raycast Dynamic Placeholders の完全互換は提供せず、置換後の値は Prompt Launcher 内の実装で生成する。

参照: https://manual.raycast.com/dynamic-placeholders

Dynamic Placeholders の置換は、元の Markdown ファイルを書き換えない。

Dynamic Placeholders の置換はコピー時にのみ実行し、置換後の文字列をクリップボードへコピーする。

Raycast API には、Markdown 本文全体を Raycast Dynamic Placeholders として一括展開する公開 API が確認できない。そのため、Prompt Launcher は対応表に記載した placeholder だけを Extension 内で置換する。日時系 placeholder の置換後の値は、Raycast 本体の展開結果ではなく、実行環境の locale に基づいて Prompt Launcher が生成する。

`{clipboard}` は、コピー対象の Markdown 本文内に `{clipboard}` が存在する場合だけ、現在のクリップボード文字列を読み取って置換する。`{clipboard}` が存在しない Markdown 本文では、クリップボードを読み取らない。

Clipboard API 参照: https://developers.raycast.com/api-reference/clipboard

### 8.2 コピー操作の分離

コピー操作は以下の2種類に分ける。

| 操作                  | 説明                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Copy Raw Content      | Markdown ファイルの内容をそのままコピーする                                               |
| Copy Expanded Content | Markdown ファイルの内容内にある対応表に記載した Dynamic Placeholders を置換してコピーする |

これにより、Dynamic Placeholders を含む Markdown ファイルと、通常の Markdown ファイルを明確に分けて扱える。

### 8.3 置換できる Dynamic Placeholders

置換できる Dynamic Placeholders は、次の表に記載したものだけとする。

| Placeholder   | 置換内容                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `{date}`      | 実行環境の locale に基づく現在日付                                                                                            |
| `{time}`      | 実行環境の locale に基づく現在時刻                                                                                            |
| `{datetime}`  | 実行環境の locale に基づく現在日時                                                                                            |
| `{day}`       | 実行環境の locale に基づく曜日                                                                                                |
| `{timezone}`  | Prompt Launcher 追加 placeholder。`Asia/Tokyo UTC+09:00` 形式の time zone                                                     |
| `{now}`       | `{datetime}` と `{timezone}` を空白で連結した現在日時。AI への指示で現在時点を明示するための Prompt Launcher 追加 placeholder |
| `{uuid}`      | ランダムな UUID                                                                                                               |
| `{clipboard}` | 現在のクリップボード文字列                                                                                                    |

この表にない placeholder は置換せず、そのままコピー結果に残す。

## 9. 初期実装の拡張対象外

初期実装では以下の拡張を扱わない。

- Windows 対応
- 4個以上の個別 Prompt Set Command
- 利用者が Raycast 設定画面だけで Command 数を増やす機能

## 10. Command 数に関する設計判断

Raycast Extension の Command は、Extension の manifest に静的に定義する。

そのため、利用者が Raycast の設定画面だけで `Prompt Set 4` 以降を自由に追加することはできない。

ただし、将来的に Extension の実装を更新すれば、`Prompt Set 4` 以降を追加することは可能である。

初期実装では、以下の理由から `Prompt Set 1` から `Prompt Set 3` までに制限する。

- 個別ショートカットとして現実的に覚えやすい数である
- Raycast の Command 一覧に不要な項目を増やさない
- 高頻度フォルダと横断検索の役割分担が明確になる
- 初期実装の複雑さを抑えられる

## 11. 操作フロー

### 11.1 個別フォルダからコピーする場合

1. 利用者が `Prompt Set 1` などの Command を起動する
2. 有効な Prompt Set の対象フォルダ配下の Markdown ファイル一覧が表示される
3. 利用者が Markdown ファイルを選択する
4. 主操作として、ファイル内容がそのままクリップボードへコピーされる
5. コピー成功後、Raycast 上で完了通知を表示する

### 11.2 個別フォルダからファイルを開く場合

1. 利用者が `Prompt Set 1` などの Command を起動する
2. Markdown ファイルを選択する
3. `Editor` が設定済みの場合は、Action Panel から `Open in Editor` を選択する
4. `Editor` が未設定の場合は、Action Panel から `Open` を選択する
5. `Open in Editor` は設定済みエディタで対象ファイルを開き、`Open` は既定アプリで対象ファイルを開く

### 11.3 横断検索する場合

1. 利用者が `All Prompt Sets` を起動する
2. 有効かつ設定済みのすべての Prompt Set から Markdown ファイルが一覧表示される
3. 利用者が検索して対象ファイルを選択する
4. コピーまたはエディタ起動を選択する

## 12. エラー処理

### 12.1 Prompt Set 無効またはフォルダ未設定

対象 Command に対応する Prompt Set が無効の場合は、エラーで落とさず、無効であることを表示して設定画面を開けるようにする。

表示する操作:

- `Open Extension Preferences`

対象 Command に対応する Prompt Set が有効で、Prompt Set Folder が未設定の場合は、エラーで落とさず、設定を促す画面を表示する。

表示する操作:

- `Open Extension Preferences`

Enable Prompt Set、Prompt Set Folder、Prompt Set Name、Editor、プレビュー行数、プレビュー最大文字数は Extension 共通設定として定義する。そのため、Prompt Set 無効時またはフォルダ未設定時に開く設定画面は Command Preferences ではなく Extension Preferences とする。

### 12.2 フォルダが存在しない

有効な Prompt Set の設定済みフォルダが存在しない場合は、対象フォルダが見つからないことを表示する。

この場合も、`Open Extension Preferences` を表示し、利用者が Prompt Set Folder を設定し直せるようにする。

### 12.3 Markdown ファイルが存在しない

有効な Prompt Set の対象フォルダ配下に、拡張子が `.md` の Markdown ファイルが存在しない場合は、空状態を表示する。拡張子の大文字小文字は区別しない。

空状態では `Open Extension Preferences` を表示し、利用者が Prompt Set Folder の指定を確認できるようにする。

### 12.4 ファイル読み取り失敗

ファイルの読み取りに失敗した場合は、Toast または Error View で理由を表示する。

### 12.5 クリップボードコピー失敗

クリップボードへのコピーに失敗した場合は、Toast で失敗を表示する。

## 13. セキュリティと安全性

本 Extension は、利用者が指定したローカルフォルダ配下の Markdown ファイルのみを読み取る。

初期実装ではネットワーク通信を行わない。

Dynamic Placeholders の置換は、対応する placeholder を文字列置換する処理として実行する。

Markdown ファイルの内容は、利用者がコピー操作を実行した場合のみクリップボードへ渡す。

本 Extension は Markdown ファイルを新規作成、編集、リネーム、移動、削除しない。Git 操作やクラウド同期も実行しない。

## 14. 実装方針

### 14.1 技術構成

- Raycast Extension
- TypeScript
- React
- Raycast API
- Node.js 標準ライブラリ

### 14.2 追加ライブラリ方針

初期実装では、可能な限り追加ライブラリを導入しない。

Markdown ファイルの再帰探索は Node.js 標準ライブラリで実装する。

Dynamic Placeholders の置換は対応する placeholder の置換処理として実装する。追加ライブラリは導入しない。

### 14.3 ローカル検証方針

本プロジェクトのローカル確認は、用途ごとに以下へ分ける。

- Raycast CLI を使わない一括確認: `npm run check`
- Raycast CLI を使わない source lint: `npm run check:lint`
- Raycast CLI を使わない整形確認: `npm run check:format`
- author 検証を行わないローカル開発用 lint: `npm run lint:local`
- Prettier による整形: `npm run format`
- GitHub Actions で実行する公開前 lint: `npm run lint`
- Raycast development mode での手動動作確認: `npm run dev`
- Raycast development mode 用デモ Prompt Set 生成: `npm run demo:setup`
- Raycast development mode 用デモ Prompt Set 削除: `npm run demo:clean`
- 公開用アイコン生成: `npm run icon:generate`
- distribution build の確認: `npm run build`
- 依存 package と Raycast API の一括更新: `npm run update:dependencies`
- `@raycast/api` 更新時の移行: `npm run migrate`

`npm run check` は TypeScript 型検査、author 検証を行わないローカル開発用 lint、Raycast アプリに依存しない単体確認を実行する。Raycast CLI の厳密 lint、development mode、distribution build は `check` には含めず、目的に応じて個別に実行する。

`npm run lint:local` は `ESLint` と `Prettier` を直接実行する。`package.json` の `author` を Raycast account username として検証しない。

`npm run check:format` は、`package.json` の script で明示指定した管理対象ファイルに対して `prettier --check` を実行する。

`npm run format` は、`package.json` の script で明示指定した管理対象ファイルに対して `prettier --write` を実行する。

Prettier 対象は以下とする。

```text
src/**/*.{ts,tsx}
scripts/*.mjs
README.md
README.ja.md
CHANGELOG.md
docs/**/*.md
package.json
tsconfig.json
eslint.config.js
.prettierrc
.github/dependabot.yml
.github/workflows/*.yml
.github/release-manifest.json
.github/release-changelog/*.md
```

`package-lock.json` は npm が生成する lock file であるため、Prettier 対象には含めない。画像、生成物、ローカル専用出力も Prettier 対象には含めない。

`npm run lint` は `ray lint` を実行する。Raycast CLI は source lint だけでなく package manifest、icon、metadata、author の厳密検証を行うため、GitHub Actions の `Build` で実行する。`Release` は `Build` を呼び出す。`Publish Release to Raycast` では `npm run lint` を個別 step として実行しない。`package.json` の `author` は Raycast account username と一致している必要がある。

`npm run dev` は `ray develop` を実行し、Raycast アプリ上で一覧表示、コピー、Dynamic Placeholders、プレビュー、エディタ起動を人間が操作して確認する。

`npm run demo:setup` は `demo/prompt-sets/` 配下に、Raycast development mode で手動確認するための Prompt Set フォルダを生成する。生成される Prompt Set には、ネストされた Markdown ファイル、大文字拡張子 `.MD` の Markdown ファイル、対応表に記載した全種類の Dynamic Placeholders を含む Markdown ファイル、拡張子が `.md` ではないファイル、除外対象ディレクトリ配下の Markdown ファイルを含める。

`npm run demo:clean` は `demo/prompt-sets/` を削除する。

`demo/prompt-sets/` は Git 管理対象外とする。登録するのは生成スクリプトとドキュメントだけであり、生成された Markdown ファイルや確認用フォルダは Git に含めない。

`demo/prompt-sets/` は Raycast development mode で指定する Prompt Set Folder である。

`npm run icon:generate` は `scripts/generate-icon.mjs` を実行し、`assets/icon.generated.png` を生成する。生成後に `assets/icon.png` へ反映するかを確認し、`yes` と入力した場合だけ `assets/icon.png` を上書きして `assets/icon.generated.png` を削除する。`yes` 以外の場合は `assets/icon.png` を変更せず、`assets/icon.generated.png` を残す。生成後はアイコンセット定義に照らして目視確認する。

非対話環境で確認を省略する場合は、`npm run icon:generate -- --yes` または `node scripts/generate-icon.mjs --yes` を使う。生成だけ行い、`assets/icon.png` を変更しない場合は、`npm run icon:generate -- --no` または `node scripts/generate-icon.mjs --no` を使う。

`npm run build` は `ray build -e dist` を実行し、公開前に distribution build が成功することを確認する。実行時は Raycast CLI がローカル拡張出力先へ書き込む可能性がある。具体例として、macOS では `~/.config/raycast/extensions/prompt-launcher` 配下が作成または更新される可能性がある。

`npm run update:dependencies` は `dependencies` と `devDependencies` にあるすべての package を `@latest` で一括更新する。更新後は `npm run migrate` と `npm run check` を実行する。この script は `package.json` と `package-lock.json` を更新する。

依存 package は個別更新せず、`npm run update:dependencies` で一括更新する。

`npm run migrate` は `npx --yes @raycast/migration@latest .` を実行する。これは通常確認のたびに実行せず、`@raycast/api` の更新または Raycast migration が必要な場合だけ実行する。

依存 package と GitHub Actions の更新検知は `.github/dependabot.yml` で管理する。

Dependabot の対象は以下とする。

| package ecosystem | directory | 目的                                                                              |
| ----------------- | --------- | --------------------------------------------------------------------------------- |
| `github-actions`  | `/`       | `.github/workflows/` で利用する GitHub Actions の更新候補を検知する               |
| `npm`             | `/`       | `package.json` と `package-lock.json` で管理する npm package の更新候補を検知する |

Dependabot の schedule は、毎週月曜日 `09:00`、`Asia/Tokyo` とする。

Dependabot が作成する Pull Request は、更新候補の通知として扱う。自動 merge、自動 publish、自動 release は行わない。

Dependabot の Pull Request を反映する場合は、人間がローカルで変更箇所を確認し、必要に応じて `npm run migrate`、`npm run check`、`npm run build`、`npm run lint` を実行してから判断する。

Raycast アプリに依存しない単体確認スクリプトは、リポジトリ管理対象の `scripts/local-verification.mjs` に配置する。対象は Command entry point、Prompt Set preferences、Preview preferences、Markdown ファイル探索、Preview、Dynamic Placeholders の確認に限定する。単体確認で生成する fixture と bundle 出力は `local-verification/` 配下に作成する。`local-verification/` は Git 管理対象外の生成物ディレクトリとし、公開用アイコン生成 script は `local-verification/` を参照しない。

`scripts/local-verification.mjs` は、release workflow、publish workflow、GitHub Release body、Dependabot、アイコン生成 script、README や仕様書の文言監視を扱わない。Release 関連の検証は `scripts/release-manifest.mjs` と GitHub Actions の `Release` / `Publish Release to Raycast` workflow で扱う。Raycast 公開要件の icon、metadata、author、manifest schema は `npm run lint`、distribution build は `npm run build` で扱う。

ローカル検証の具体的な手順は `docs/local-verification.md` を正とする。

### 14.4 リリースと公開実行の扱い

以下はローカル確認では実行しない。

```text
ray publish
npm run lint
npm run publish
gh release create
git tag vX.Y.Z
```

`npm run lint` は GitHub Actions の `Build` で実行する。`Release` は `Build` を呼び出す。`Publish Release to Raycast` では `npm run lint` を個別 step として実行しない。ローカル開発では `npm run check` または `npm run lint:local` を使う。

リリースタグ作成、GitHub Release 作成、Raycast Store への公開実行は GitHub Actions で扱う。ローカルでは `publish` を実行しない。

GitHub Actions は、`Build` と `Release` を分けて扱う。

`Build` は `.github/workflows/build.yml` で管理する。`Build` は、リモート repository に branch が push された時点、Pull Request の作成または更新時、GitHub Actions 画面からの手動実行時、`Release` workflow からの呼び出し時に実行する。

`Build` は以下を実行する。

1. `npm run check`
2. `npm run build`
3. `npm run lint`

`Build` は release tag 作成、GitHub Release 作成、Raycast Store publish を実行しない。

リリース管理では、次の 3 つを分けて扱う。

| 対象                          | 管理場所                                                         | 役割                                                             |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| GitHub Release                | Git tag / GitHub Release / `.github/release-changelog/vX.Y.Z.md` | GitHub 上の release tag と release notes                         |
| Raycast Store publish         | `.github/workflows/publish-release-to-raycast.yml`               | 作成済み GitHub Release tag を Raycast Store に publish する処理 |
| Raycast Store Version History | `CHANGELOG.md`                                                   | Raycast Store 利用者に表示する更新履歴                           |

`package.json` に `version` は定義しない。

`VERSION` や `release.json` のような別のバージョン管理ファイルは作成しない。

`.github/release-manifest.json` は、次に作成する GitHub Release の計画ファイルである。現在状態ファイルではなく、GitHub Release 作成後、または Raycast Store publish 完了後に自動更新しない。次の GitHub Release を作る前に、人間がローカルで更新する。

`.github/release-manifest.json` の構造は以下とする。

```json
{
  "tag": "vX.Y.Z",
  "title": "vX.Y.Z",
  "previousGitHubReleaseTag": "vX.Y.Z",
  "githubReleaseChangelogFile": ".github/release-changelog/vX.Y.Z.md",
  "previousRaycastStorePublishTag": "vX.Y.Z"
}
```

各項目の意味は以下とする。

| 項目                             | 意味                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tag`                            | 今回作成する GitHub Release tag                                                                                  |
| `title`                          | 今回作成する GitHub Release title                                                                                |
| `previousGitHubReleaseTag`       | 最後に作成済みの GitHub Release tag                                                                              |
| `githubReleaseChangelogFile`     | 今回の GitHub Release body として使う changelog file                                                             |
| `previousRaycastStorePublishTag` | 最後に Raycast Store publish 済みの GitHub Release tag。まだ一度も Raycast Store publish していない場合は `null` |

`.github/release-changelog/vX.Y.Z.md` は GitHub Release 用 changelog である。1 つの GitHub Release tag に対して 1 つ作成し、その GitHub Release に含める変更を記載する。GitHub Release body は、manifest の `githubReleaseChangelogFile` から作成する。

Raycast Store publish を行う場合は、GitHub Release 作成前に `CHANGELOG.md` を更新しておく。Raycast Store publish 対象の GitHub Release tag には、その時点の `CHANGELOG.md` が含まれている必要がある。

Raycast Store Version History は、`previousRaycastStorePublishTag` の次から `tag` までの GitHub Release 用 changelog を積算し、その中から Raycast Store 利用者に必要な変更だけを抽出して `CHANGELOG.md` の先頭 entry として記載する。

`CHANGELOG.md` entry の見出しは以下の形式とする。

```markdown
## [Title] - {PR_MERGE_DATE}
```

GitHub Release 用の `vX.Y.Z` は `CHANGELOG.md` の見出しに含めない。

GitHub Actions の手動 workflow `.github/workflows/release.yml` は、`publish_to_raycast` input を持つ。

| `publish_to_raycast` | 実行内容                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `true`               | `Build` 実行、release tag 作成、GitHub Release 作成、作成した release tag の Raycast Store publish |
| `false`              | release tag 作成、GitHub Release 作成。Raycast publish は実行しない                                |

`publish_to_raycast` が `true` の場合は、`.github/workflows/publish-release-to-raycast.yml` を呼び出し、作成した release tag を `release_tag` として渡す。

`Publish Release to Raycast` は、既存 GitHub Release tag を Raycast Store に publish する workflow である。`release_tag` は `vX.Y.Z` のような release tag とし、branch や任意 commit SHA は指定しない。

`publish_to_raycast` が `true` で Raycast Store publish が失敗した場合でも、release tag と GitHub Release は作成済みの状態で残る。この場合は、`Publish Release to Raycast` workflow に同じ `release_tag` を指定して再実行する。

`Publish Release to Raycast` は実行前に、`release_tag` が `vX.Y.Z` 形式であること、Git tag が存在すること、GitHub Release が存在すること、checkout 対象が `release_tag` であること、checkout した tag 内の `.github/release-manifest.json` の `tag` が `release_tag` と一致すること、`CHANGELOG.md` に Raycast Store Version History として使う先頭 entry が存在すること、その先頭 entry が `## [Title] - {PR_MERGE_DATE}` 形式であること、その先頭 entry の本文が空ではないことを確認する。

`Publish Release to Raycast` は、`release_tag` を checkout し、`.github/release-manifest.json` と `CHANGELOG.md` の Raycast Store Version History 用先頭 entry を Raycast publish 用として検証し、Raycast publish 用 GitHub token を確認してから `npm run publish` を実行する。release tag 作成、GitHub Release 作成、`npm run check`、`npm run build`、`npm run lint` は実行しない。

`Publish Release to Raycast` は `npm run check:local` を実行しない。`npm run check:local` は `local-verification/` を生成するため、Raycast Store publish 直前の workflow に含めない。

GitHub Actions から Raycast Store publish を実行する場合は、Repository secret `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` を使用する。

`RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` は Raycast の token ではなく、Public Store へ公開 Pull Request を作成する GitHub アカウントで発行した GitHub Personal Access Token classic とする。scope は `public_repo` だけを設定する。

`.github/workflows/publish-release-to-raycast.yml` は、Repository secret `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` を `npm run publish` 実行時の `GITHUB_ACCESS_TOKEN` 環境変数へ渡す。`GITHUB_ACCESS_TOKEN` は Raycast CLI publish が GitHub 認証に使用する環境変数である。

GitHub Actions 標準の `GITHUB_TOKEN` は、`raycast/extensions` へ公開 Pull Request を作成する publish 認証には使用しない。`GH_TOKEN` は GitHub Release の存在確認など GitHub CLI 用に限定して使用する。

Raycast Store publish では、Personal Access Token classic を使用する。この workflow では fine-grained personal access token は使用しない。scope は `public_repo` だけを設定する。Raycast Store publish は、自分が所有していない public repository である `raycast/extensions` への fork 作成、push、Pull Request 作成を含むため、public repository 操作用の `public_repo` を使用する。`repo` は private repository も含むため、この用途では選択しない。

リリース管理の具体的な手順は `docs/release-management.md` を正とする。

### 14.5 ファイル構成

リポジトリで管理するファイル構成は以下とする。

```text
raycast-prompt-launcher
├── .github
│   ├── dependabot.yml
│   ├── release-manifest.json
│   ├── release-changelog
│   │   └── vX.Y.Z.md
│   └── workflows
│       ├── build.yml
│       ├── publish-release-to-raycast.yml
│       └── release.yml
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── README.md
├── README.ja.md
├── eslint.config.js
├── package-lock.json
├── package.json
├── tsconfig.json
├── assets
│   └── icon.png
├── docs
│   ├── assets
│   │   └── autumnal-peach.png
│   ├── local-verification.md
│   ├── release-management.md
│   ├── specification.md
│   └── store-screenshots.md
├── media
│   └── prompt-launcher-1.png
├── scripts
│   ├── demo-prompts.mjs
│   ├── generate-icon.mjs
│   ├── local-verification.mjs
│   ├── release-manifest.mjs
│   ├── sync-readme-media.mjs
│   └── update-dependencies.mjs
└── src
    ├── prompt-set-1.tsx
    ├── prompt-set-2.tsx
    ├── prompt-set-3.tsx
    ├── all-prompt-sets.tsx
    ├── components
    │   ├── AllPromptSetsCommand.tsx
    │   ├── ConfigurationRequired.tsx
    │   ├── PromptFileList.tsx
    │   └── PromptSetCommand.tsx
    ├── services
    │   ├── clipboard.ts
    │   ├── dynamicPlaceholders.ts
    │   ├── markdownFiles.ts
    │   ├── preferences.ts
    │   └── preview.ts
    └── types.ts
```

以下はローカル生成物または開発時の一時出力であり、Git 管理対象外とする。

```text
raycast-prompt-launcher
├── .DS_Store
├── .raycast
├── assets
│   └── icon.generated.png
├── dist
├── local-verification
│   ├── local-verification-dist
│   └── local-verification-fixtures
├── node_modules
├── raycast-env.d.ts
└── demo
    └── prompt-sets
```

`raycast-env.d.ts` は Raycast CLI が生成する TypeScript 定義であり、リポジトリで管理する source ではない。

`assets/icon.generated.png` は `npm run icon:generate` が生成する確認用アイコンであり、`assets/icon.png` へ反映する前の生成物として扱う。

`local-verification/` は `npm run check:local` が生成する単体確認用の fixture と bundle 出力であり、リポジトリで管理する source ではない。

`demo/prompt-sets/` は `npm run demo:setup` で生成し、`npm run demo:clean` で削除する Raycast 手動確認用データである。生成された Markdown ファイルや確認用フォルダは Git に含めない。

## 15. 採用する最終構成

初期実装では、以下の構成を採用する。

```text
Prompt Launcher
├── Prompt Set 1
├── Prompt Set 2
├── Prompt Set 3
└── All Prompt Sets
```

この構成は、以下を満たす。

- 対象フォルダを固定できる
- 主要フォルダを個別ショートカットで呼び出せる
- 各フォルダ配下の Markdown ファイル一覧を表示できる。拡張子 `.md` は大文字小文字を区別しない
- 選択したファイル内容を丸ごとクリップボードにコピーできる
- 選択したファイルを指定エディタで開くか、コピーするかを選べる
- Command 内の `Show Preview` / `Hide Preview` Action で、選択中ファイルの冒頭プレビュー表示を即時に切り替えられる
- 横断検索により、フォルダ数が増えても探しやすい
- Command 数が過剰にならない
