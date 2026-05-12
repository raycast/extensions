# リリース管理手順

## 1. 目的

この文書は、`Prompt Launcher` の GitHub Release と Raycast Store publish を GitHub Actions で扱うための手順を定義する。

ローカルでは、リリースタグ作成、GitHub Release 作成、Raycast Store publish を実行しない。ローカルで行う作業は、release に必要な管理ファイルの作成と編集、通常の確認、commit、push までとする。

## 2. 参照する公開情報

この文書の前提は以下の公開情報に基づく。

- Raycast Extension の `CHANGELOG.md` は、Raycast Store と extension detail の Version History として表示される。root に配置し、entry は `## [Title] - {PR_MERGE_DATE}` 形式にする。
  - https://developers.raycast.com/basics/prepare-an-extension-for-store
  - https://developers.raycast.com/information/versioning
- GitHub Release は Git tag に基づき、GitHub Release notes を持つ。
  - https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- GitHub Actions の手動実行は `workflow_dispatch` で扱う。workflow は GitHub 上に push 済みの内容を使って実行される。
  - https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow

## 3. 基本方針

リリース管理では、次の 3 つを分離する。

| 対象                          | 管理場所                                                         | 役割                                                             |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| GitHub Release                | Git tag / GitHub Release / `.github/release-changelog/vX.Y.Z.md` | GitHub 上の release tag と release notes                         |
| Raycast Store publish         | `.github/workflows/publish-release-to-raycast.yml`               | 作成済み GitHub Release tag を Raycast Store に publish する処理 |
| Raycast Store Version History | `CHANGELOG.md`                                                   | Raycast Store 利用者に表示する更新履歴                           |

GitHub Release は Git tag に基づく。tag はリポジトリ履歴上の特定 commit を固定するため、tag 作成後に `main` を編集しても、作成済み tag に含まれるファイルは変わらない。

Raycast Store publish は、作成済み GitHub Release tag を対象に実行する。branch や任意 commit SHA から Raycast Store publish しない。

Raycast Store Version History は、GitHub Release 用 changelog の積算情報から、Raycast Store 利用者に必要な変更だけを抽出して `CHANGELOG.md` に記載する。

## 4. 管理ファイルの責務

### 4.1 `.github/release-manifest.json`

`.github/release-manifest.json` は、次に作成する GitHub Release の計画ファイルである。

現在状態ファイルではない。GitHub Release 作成後、または Raycast Store publish 完了後に自動更新しない。次の GitHub Release を作る前に、人間がローカルで更新する。

`.github/release-manifest.json` は以下を管理する。

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

`package.json` に `version` は定義しない。

`VERSION` や `release.json` のような別のバージョン管理ファイルは作成しない。

### 4.2 `.github/release-changelog/vX.Y.Z.md`

`.github/release-changelog/vX.Y.Z.md` は、GitHub Release 用 changelog である。

1 つの GitHub Release tag に対して 1 つ作成する。ファイル名の `vX.Y.Z` は、対応する GitHub Release tag と一致させる。

このファイルには、その GitHub Release に含める変更を記載する。GitHub Release body はこのファイルの内容から作成する。

### 4.3 `CHANGELOG.md`

`CHANGELOG.md` は、Raycast Store Version History 用のファイルである。

Raycast Store に publish する場合、GitHub Release 用 changelog の積算情報から、Raycast Store 利用者に必要な変更だけを抽出し、`CHANGELOG.md` の先頭 entry として記載する。

entry の形式は以下とする。

```markdown
## [Title] - {PR_MERGE_DATE}
```

`{PR_MERGE_DATE}` は Raycast の公開 Pull Request が merge された日付として扱われるため、ローカルや GitHub Release 作成時には日付へ置換しない。

GitHub Release 用の `vX.Y.Z` は `CHANGELOG.md` の見出しに含めない。

## 5. `.github/release-manifest.json` の更新手順

次の GitHub Release を作る前に、以下の順序で `.github/release-manifest.json` を更新する。

1. 最後に作成済みの GitHub Release tag を確認する。
2. 今回作成する GitHub Release tag を決める。
3. 今回作成する GitHub Release title を決める。
4. 今回の GitHub Release 用 changelog file を作成する。
5. 最後に Raycast Store publish 済みの GitHub Release tag を確認する。
6. `.github/release-manifest.json` を今回 release 用に更新する。

各項目の入力基準は以下とする。

| manifest 項目                    | 入力基準                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `tag`                            | 今回作成する GitHub Release tag                                                 |
| `title`                          | 今回作成する GitHub Release title。通常は `tag` と同じ                          |
| `previousGitHubReleaseTag`       | 最後に作成済みの GitHub Release tag                                             |
| `githubReleaseChangelogFile`     | 今回作成する `.github/release-changelog/vX.Y.Z.md`                              |
| `previousRaycastStorePublishTag` | 最後に Raycast Store publish 済みの GitHub Release tag。存在しない場合は `null` |

## 6. GitHub Release 作成手順

GitHub Release を作成する場合は、以下を行う。

1. 最後に作成済みの GitHub Release tag を確認する。
2. 今回作成する GitHub Release tag を決める。
3. `.github/release-changelog/vX.Y.Z.md` を作成する。
4. 今回の GitHub Release に含まれる変更を `.github/release-changelog/vX.Y.Z.md` に記載する。
5. `.github/release-manifest.json` を更新する。
6. 必要な確認を行う。
7. 変更を commit / push する。
8. GitHub Actions の `Release` workflow を実行する。

`Release` workflow は、push 済みの `.github/release-manifest.json` を読み、manifest の `tag` で Git tag と GitHub Release を作成する。

GitHub Release body は、manifest の `githubReleaseChangelogFile` から作成する。

## 7. Raycast Store publish 手順

Raycast Store publish を行う場合は、GitHub Release 作成前に `CHANGELOG.md` を更新しておく。

理由は、Raycast Store publish 対象の GitHub Release tag には、その時点の `CHANGELOG.md` が含まれている必要があるためである。tag 作成後に `main` の `CHANGELOG.md` を修正しても、作成済み tag には反映されない。

Raycast Store publish を行う場合は、以下を行う。

1. 今回 publish 対象の GitHub Release tag を決める。
2. 最後に Raycast Store publish 済みの GitHub Release tag を確認する。
3. 最後に Raycast Store publish 済みの GitHub Release tag の次から、今回 publish 対象の GitHub Release tag までの GitHub Release 用 changelog を積算する。
4. 積算した内容から、Raycast Store 利用者に必要な変更だけを抽出する。
5. 抽出した内容を `CHANGELOG.md` の先頭 entry として記載する。
6. `CHANGELOG.md` の entry を `## [Title] - {PR_MERGE_DATE}` 形式にする。
7. 変更を commit / push する。
8. GitHub Actions の `Release` workflow を実行する。
9. `Release` workflow の `publish_to_raycast` を `true` にする、または作成済み GitHub Release tag を指定して `Publish Release to Raycast` workflow を実行する。

積算範囲は以下とする。

| 状態                                         | 積算範囲                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `previousRaycastStorePublishTag` が `null`   | 最初の GitHub Release から今回 publish 対象 tag まで                                  |
| `previousRaycastStorePublishTag` が `vX.Y.Z` | `previousRaycastStorePublishTag` の次の GitHub Release から今回 publish 対象 tag まで |

## 8. 例

### 8.1 初回 Raycast Store publish

状態:

```text
最後に作成済みの GitHub Release tag:
  v0.1.0

今回作成する GitHub Release tag:
  v0.1.1

最後に Raycast Store publish 済みの GitHub Release tag:
  なし
```

`.github/release-manifest.json`:

```json
{
  "tag": "v0.1.1",
  "title": "v0.1.1",
  "previousGitHubReleaseTag": "v0.1.0",
  "githubReleaseChangelogFile": ".github/release-changelog/v0.1.1.md",
  "previousRaycastStorePublishTag": null
}
```

Raycast Store Version History の入力は、最初の GitHub Release から `v0.1.1` までの GitHub Release 用 changelog の積算である。

### 8.2 前回 publish 後の通常 release

状態:

```text
最後に作成済みの GitHub Release tag:
  v0.1.1

今回作成する GitHub Release tag:
  v0.1.2

最後に Raycast Store publish 済みの GitHub Release tag:
  v0.1.1
```

`.github/release-manifest.json`:

```json
{
  "tag": "v0.1.2",
  "title": "v0.1.2",
  "previousGitHubReleaseTag": "v0.1.1",
  "githubReleaseChangelogFile": ".github/release-changelog/v0.1.2.md",
  "previousRaycastStorePublishTag": "v0.1.1"
}
```

Raycast Store Version History の入力は、`v0.1.1` の次の GitHub Release から `v0.1.2` までの GitHub Release 用 changelog の積算である。

### 8.3 GitHub Release だけを挟んだ後の publish

状態:

```text
最後に作成済みの GitHub Release tag:
  v0.1.2

今回作成する GitHub Release tag:
  v0.1.3

最後に Raycast Store publish 済みの GitHub Release tag:
  v0.1.1
```

`.github/release-manifest.json`:

```json
{
  "tag": "v0.1.3",
  "title": "v0.1.3",
  "previousGitHubReleaseTag": "v0.1.2",
  "githubReleaseChangelogFile": ".github/release-changelog/v0.1.3.md",
  "previousRaycastStorePublishTag": "v0.1.1"
}
```

Raycast Store Version History の入力は以下の積算である。

```text
.github/release-changelog/v0.1.2.md
.github/release-changelog/v0.1.3.md
```

## 9. GitHub Actions

GitHub Actions は、`Build`、`Release`、`Publish Release to Raycast` を分けて扱う。

### 9.1 Build

`Build` は、公開前に Extension が成立していることを確認する workflow である。

対象ファイルは `.github/workflows/build.yml` とする。

`Build` は以下の trigger で実行する。

| Trigger             | 目的                                                           |
| ------------------- | -------------------------------------------------------------- |
| `push`              | リモート repository に branch が push された時点で自動確認する |
| `pull_request`      | Pull Request の作成または更新時に自動確認する                  |
| `workflow_dispatch` | GitHub Actions 画面から手動で何度でも確認する                  |
| `workflow_call`     | `Release` workflow から同じ確認を呼び出す                      |

`Build` は以下を実行する。

1. `npm run check`
2. `npm run build`
3. `npm run lint`

`Build` は release tag 作成、GitHub Release 作成、Raycast Store publish を実行しない。

### 9.2 Release

`Release` は、GitHub tag と GitHub Release を作成する workflow である。

対象ファイルは `.github/workflows/release.yml` とする。

`Release` は GitHub Actions 画面から手動実行する。

Workflow input は以下とする。

| Input                | 型      | 説明                                                                                                                         |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `publish_to_raycast` | boolean | `true` の場合は、作成した GitHub Release tag を Raycast Store publish に渡す。`false` の場合は GitHub Release だけを作成する |

`Release` は以下を実行する。

1. `Build` workflow を呼び出す。
2. `.github/release-manifest.json` を検証する。
3. manifest の `tag` を release tag として作成する。
4. manifest の `githubReleaseChangelogFile` から GitHub Release body を生成する。
5. GitHub Release を作成する。
6. `publish_to_raycast` が `true` の場合だけ `Publish Release to Raycast` workflow を呼び出す。

`Release` から Raycast Store publish を呼び出す場合も、publish 対象は作成した release tag に固定する。

`publish_to_raycast` が `true` で Raycast Store publish が失敗した場合でも、release tag と GitHub Release は作成済みの状態で残る。この場合は、`Publish Release to Raycast` workflow に同じ `release_tag` を指定して再実行する。

### 9.3 Publish Release to Raycast

`Publish Release to Raycast` は、既存 GitHub Release tag を Raycast Store に publish する workflow である。

対象ファイルは `.github/workflows/publish-release-to-raycast.yml` とする。

`Publish Release to Raycast` は以下の trigger で実行する。

| Trigger             | 目的                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `workflow_dispatch` | 既存 GitHub Release tag を指定して、Raycast Store publish だけを手動実行または再実行する |
| `workflow_call`     | `Release` workflow から、作成した release tag を渡して実行する                           |

Workflow input は以下とする。

| Input         | 型     | 説明                                                 |
| ------------- | ------ | ---------------------------------------------------- |
| `release_tag` | string | Raycast Store に publish する既存 GitHub Release tag |

`release_tag` は `vX.Y.Z` のような release tag とする。

`Publish Release to Raycast` は実行前に以下を確認する。

1. `release_tag` が `vX.Y.Z` 形式である。
2. `release_tag` の Git tag が存在する。
3. `release_tag` の GitHub Release が存在する。
4. checkout 対象が `release_tag` である。
5. checkout した tag 内の `.github/release-manifest.json` の `tag` が `release_tag` と一致する。
6. checkout した tag 内の `CHANGELOG.md` に Raycast Store Version History として使う先頭 entry が存在する。
7. `CHANGELOG.md` の先頭 entry が `## [Title] - {PR_MERGE_DATE}` 形式である。
8. `CHANGELOG.md` の先頭 entry の本文が空ではない。

`Publish Release to Raycast` は以下を実行する。

1. `release_tag` を checkout する。
2. `.github/release-manifest.json` と `CHANGELOG.md` の Raycast Store Version History 用先頭 entry を検証する。
3. Raycast publish 用 GitHub token を確認する。
4. `npm run publish`

`Publish Release to Raycast` は以下を実行しない。

- release tag 作成
- GitHub Release 作成
- `npm run check`
- `npm run build`
- `npm run lint`
- `npm run check:local`
- branch からの Raycast Store publish
- 任意 commit SHA からの Raycast Store publish

`npm run check:local` は `local-verification/` を生成するため、Raycast Store publish 直前の workflow では実行しない。

GitHub Release と Raycast Store publish は、同一の `release_tag` を対象にする。

## 10. Dependabot

依存 package と GitHub Actions の更新検知は `.github/dependabot.yml` で管理する。

Dependabot は、更新候補の Pull Request を作成する。Dependabot の Pull Request は GitHub Release や Raycast Store publish ではない。

Dependabot の Pull Request を反映する場合は、人間がローカルで変更箇所を確認してから判断する。自動 merge、自動 publish、自動 release は行わない。

## 11. Secret

Raycast Store publish を GitHub Actions から実行する場合、Repository secret に `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` を設定する。

`RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` は、Raycast の token ではなく GitHub の Personal Access Token classic である。

この token は、`npm run publish` が `raycast/extensions` へ公開 Pull Request を作成するための GitHub 認証に使う。

Repository secret 名は `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` とする。`Publish Release to Raycast` workflow は、この secret を `npm run publish` の実行時に Raycast CLI が参照する `GITHUB_ACCESS_TOKEN` 環境変数へ渡す。

GitHub Actions 標準の `GITHUB_TOKEN` は、このリポジトリ内の workflow 実行用 token であり、権限は workflow を含むリポジトリに限定される。そのため、`raycast/extensions` へ公開 Pull Request を作成する `npm run publish` には使用しない。

`GH_TOKEN` は GitHub CLI 用の認証変数である。`Publish Release to Raycast` workflow では GitHub Release の存在確認にのみ使用し、Raycast CLI の publish 認証には使用しない。

`RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` には、Public Store へ公開 Pull Request を作成する GitHub アカウントで作成した Personal Access Token classic を設定する。この workflow では fine-grained personal access token は使用しない。

Personal Access Token classic の scope は `public_repo` だけを設定する。Raycast Store publish は、自分が所有していない public repository である `raycast/extensions` への fork 作成、push、Pull Request 作成を含むため、public repository 操作用の `public_repo` を使用する。`repo` は private repository も含むため、この用途では選択しない。

### 11.1 Personal Access Token classic の作成手順

Personal Access Token classic の作成手順は以下とする。

1. `https://github.com/settings/tokens/new` を開く。
2. `Generate new token (classic)` を選ぶ。
3. `Note` に `raycast-prompt-launcher publish` など用途が分かる名前を入力する。
4. `Expiration` を設定する。
5. `Select scopes` で `public_repo` を選ぶ。
6. token を生成し、値をコピーする。

生成した token は、このリポジトリの GitHub Repository Secret として以下の名前で保存する。

```text
RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC
```

Repository Secret の設定手順は以下とする。

1. `https://github.com/uchimanajet7/raycast-prompt-launcher/settings/secrets/actions` を開く。
2. `Secrets` tab で `New repository secret` を選ぶ。
3. `Name` に `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` を入力する。
4. `Secret` に Personal Access Token の値を入力する。
5. `Add secret` で保存する。

この secret が必要になる段階は、`.github/workflows/publish-release-to-raycast.yml` の `npm run publish` step に到達した時である。

`npm run publish` で token が認識されない場合、Raycast CLI は GitHub の device flow に入り、GitHub Actions の非対話環境では入力待ちにできないため失敗する。workflow では `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` の空チェックと、`GITHUB_ACCESS_TOKEN` への受け渡しを両方行う。

この secret が未設定、空、または権限不足の場合、Raycast Store publish は失敗する。

`publish_to_raycast` が `false` の GitHub Release では、この secret は使用しない。

## 12. 実行前確認

GitHub Release 作成前に以下を確認する。

- `.github/release-manifest.json` の `tag` が今回作成する GitHub Release tag と一致している。
- `.github/release-manifest.json` の `title` が今回作成する GitHub Release title と一致している。
- `.github/release-manifest.json` の `previousGitHubReleaseTag` が最後に作成済みの GitHub Release tag と一致している。
- `.github/release-manifest.json` の `githubReleaseChangelogFile` が今回の GitHub Release 用 changelog file と一致している。
- `githubReleaseChangelogFile` のファイルが存在する。
- `githubReleaseChangelogFile` のファイル名が `tag` と対応している。
- README に掲載するスクリーンショットを更新した場合は、`npm run sync:readme-media` を実行済みである。

Raycast Store publish を行う場合は、GitHub Release 作成前に以下を確認する。

- `.github/release-manifest.json` の `previousRaycastStorePublishTag` が最後に Raycast Store publish 済みの GitHub Release tag と一致している。
- `previousRaycastStorePublishTag` の次から `tag` までの GitHub Release 用 changelog を積算できる。
- `CHANGELOG.md` の先頭 entry が積算内容から抽出された Raycast Store 利用者に必要な変更である。
- `CHANGELOG.md` の先頭 entry が `## [Title] - {PR_MERGE_DATE}` 形式である。
- `publish_to_raycast` を `true` にする、または `.github/workflows/publish-release-to-raycast.yml` を対象 `release_tag` で実行する。
- `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` が Repository secret に設定されている。
- `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` には `public_repo` scope を持つ Personal Access Token classic を設定している。

## 13. ローカルで実行しないこと

ローカルでは以下を実行しない。

```bash
ray publish
```

```bash
npm run publish
```

```bash
gh release create
```

```bash
git tag vX.Y.Z
```

リリースタグ作成、GitHub Release 作成、Raycast Store publish は GitHub Actions で扱う。
