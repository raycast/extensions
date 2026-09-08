# GitHub Review Requests

Find pull requests waiting for your review, see which of your own PRs need action, and track conversations awaiting your reply.

The original **Search Review Requests** command and **My Pull Requests** menu bar remain available. The menu bar keeps its GitHub icon, organization groups, recent history, and four review-status categories:

- **Wait For Merge:** your approved PRs.
- **Wait For Change:** your PRs with changes requested.
- **Wait For Review:** your PRs awaiting a review decision.
- **New Review Request:** other people's PRs requesting your review.

Additional commands provide conversation-wide reply tracking, ageing indicators, saved filters, and an activity inbox. Background tracking and desktop notifications are optional and off by default.

## Choose how to authenticate

Open **Raycast Settings → Extensions → GitHub Review Requests** and set **Authentication Method**. Both methods work with every command, including the original search and menu bar.

| Method                              | When to choose it                                                                                                   | Setup                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Personal Access Token** (default) | Your PAT already works, or you prefer a credential dedicated to the extension. No CLI installation is needed.       | Enter your token in **Personal Access Token**.                                            |
| **GitHub CLI (existing gh login)**  | You already use `gh`, especially at an organization where that CLI login can already access your work repositories. | Select this method; the extension reads the credential from your local `gh` installation. |

Existing PAT users do not need to migrate or install `gh`. Selecting CLI authentication ignores the saved PAT. Selecting PAT authentication never invokes `gh`. A failed credential does **not** trigger fallback to the other method: the extension reports the failure so you can fix the method you selected.

### Why offer GitHub CLI authentication?

At a large organization, getting a new credential approved can involve additional setup or an administrator. You may already have a GitHub CLI login that can access the repositories you need. The CLI option reuses that working credential, which can avoid creating and authorizing a separate PAT or introducing another OAuth application for this extension.

The extension obtains the selected host's credential through [`gh auth token`](https://cli.github.com/manual/gh_auth_token), then uses it for GitHub API requests. It does not create its own OAuth application or persist a copy of the CLI token in extension storage. The token is held briefly in memory during command execution.

**This reuses existing access; it does not bypass SSO, token permissions, or organization policies.** Being signed into GitHub in a browser is not sufficient by itself. Your CLI credential must already have access, or you must complete the organization's required authorization. Some organizations restrict OAuth apps, and some restrict PATs; either method can require approval. See [GitHub's OAuth app restrictions](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions).

### Set up the GitHub CLI option

1. If you already use `gh`, check your login first:

   ```sh
   gh auth status --hostname github.com
   ```

2. If it is not installed or you have not signed in yet:

   ```sh
   brew install gh
   gh auth login --hostname github.com --web
   ```

3. If your CLI OAuth token is missing permissions for private PRs or organization/team discovery, request the necessary scopes:

   ```sh
   gh auth refresh --hostname github.com --scopes repo,read:org
   ```

4. In the extension preferences, set **Authentication Method → GitHub CLI (existing gh login)**. Leave the PAT field empty if you do not use it. If auto-detection fails, set **gh CLI Path** to the absolute path returned by `command -v gh`.
5. Open **Search Review Requests** or **Pull Request Attention**. Under **Configure Review Tracking → Account & Data**, verify the signed-in account.

To verify access to a known work repository without modifying anything, replace `YOUR_ORG/YOUR_REPO` and run:

```sh
gh repo view YOUR_ORG/YOUR_REPO --json nameWithOwner
```

If this fails, fix the CLI credential's repository access first. If it succeeds but the extension cannot find that repository, check the selected host, organization filters, and whether Raycast is using the same CLI login. Raycast does not read your interactive shell's `.zshrc`; an environment-only token in that file is not a reliable Raycast setup. Prefer the CLI's normal credential storage. See [`gh auth login`](https://cli.github.com/manual/gh_auth_login).

For GitHub Enterprise Server, set **GitHub Host** to its hostname and authenticate `gh` for that same hostname. All commands use that host. Troubleshooting links to GitHub settings may need to be opened on your enterprise instance instead.

### Set up the PAT option, including SSO

1. In [GitHub developer settings](https://github.com/settings/tokens), create or select a PAT allowed by your organization. For the classic-token workflow, `repo` supports private PR access and `read:org` supports organization/team discovery.
2. For a **classic PAT** accessing an SSO organization, choose **Configure SSO → Authorize** next to the token and complete the organization's sign-in. If Configure SSO is missing, first authenticate to that organization through its identity provider.
3. In Raycast's extension preferences, keep **Authentication Method → Personal Access Token** and enter the token in the password field.
4. Verify a known accessible repository/PR before relying on the results for work.

SSO does not inherently prevent PAT access. However, an organization or enterprise can **block classic PATs**. A **fine-grained PAT** requires the correct resource owner, selected repositories, and permissions; it may also need administrator approval. A narrow token may support reading selected PRs while lacking team discovery or permission to post replies. The extension cannot widen that token's access. See [PAT authorization for SSO](https://docs.github.com/en/enterprise-cloud%40latest/authentication/authenticating-with-single-sign-on/authorizing-a-personal-access-token-for-use-with-single-sign-on) and [organization PAT policies](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization).

If an organization is missing from results, do not assume there are no PRs. Check credential permissions, SSO authorization, organization policy, IP/VPN requirements, and your filters. GitHub may return partial results or conceal inaccessible resources. A reported SSO refusal is displayed alongside the available results in Pull Request Attention.

## Review and reply tracking

Open **Pull Request Attention** to browse review requests, team requests, your PRs, conversations awaiting your reply, watched repositories, and saved filters.

**Awaiting my reply** considers unresolved inline review threads and the main PR conversation, including review bodies. You are considered involved when you authored the PR or participated in the conversation. Ignored authors are excluded from reply detection. Opening a waiting item links to the relevant comment where available.

Ageing indicators distinguish how long a PR has been open, how long it has been quiet, and how long an unanswered conversation has been waiting. Recent unrelated activity does not make an old unanswered request fresh. Sort by recent activity, longest wait, longest quiet period, or oldest PR.

Open **Configure Review Tracking** to select organizations, watched repositories and teams, ignored authors, and saved filters. The existing **Organizations/Owners** preference seeds the new tracking scope on first use. Once saved, tracking configuration is independent; changing the original owner preference does not overwrite it. The original search command still accepts GitHub search qualifiers in its search field.

These are attention signals based on the fetched conversation, not a guarantee that every comment is a question. Searches and nested conversations have limits; very large or busy PRs can have older messages outside the fetched window. Verify the full discussion on GitHub when needed.

## Menu bar

The first time a view command successfully authenticates, it automatically starts **My Pull Requests** in the menu bar. This happens once, so later launches do not override your decision to hide it. If Raycast has disabled the command, the extension cannot enable it programmatically; a notification links to settings. You can also use **Configure Review Tracking → Show in Menu Bar** to start it again.

Both menu layouts include **Configure Review Tracking → Authentication Method**, which shows the current method and opens the native extension preferences to change it. The tracking settings screen also has an **Account & Data → Authentication Method** row. Raycast owns this preference; these shortcuts use the same PAT/CLI selector rather than storing a second selection.

Both menu layouts include **Configure Review Tracking**, with shortcuts to Organizations, Watched Repositories, Watched Teams, Default Filter Scope, Ignored Authors, Saved Filters, Built-in Categories, and Notifications. Each opens the same configuration screen used by the settings command. These settings govern the attention/tracking views; they do not replace the original layout’s review-status grouping or its Organizations/Owners preference.

**My Pull Requests** retains the original GitHub icon and review-status layout by default. Its menu also links to Pull Request Attention and Activity Inbox.

For the optional attention layout, open **Raycast Settings → Extensions → GitHub Review Requests → My Pull Requests** and set **Menu Bar Layout → Attention and replies**. This keeps the same GitHub icon and shows review/reply attention, with configurable categories, an inline result limit, and overflow submenus. The original recent-history and review-status groups are available by switching back to **Review status (original)**. Only one menu-bar command is installed.

## Activity inbox and notifications

Open **Activity Inbox** and use its refresh action to check GitHub manually. The **first check establishes a baseline** and creates no backlog of notifications. A subsequent check records new or changed activity.

To collect activity automatically, enable **Background Activity Tracking** in extension preferences. It checks approximately every ten minutes while Raycast can run the command. When disabled, scheduled invocations return without requesting GitHub; explicit manual checks still work.

Desktop banners are a separate opt-in under **Configure Review Tracking → Notifications**. Configure event kinds, sound, quiet hours, and a per-check cap. The inbox records detected activity even when banners are off. It keeps up to 500 entries from the last 72 hours. Polling can miss intermediate states between checks, so this is not a complete GitHub event archive.

For validation, use a disposable PR and a willing reviewer: establish the baseline, have them add a comment, refresh, verify the inbox deep link, then refresh again and confirm the unchanged activity is not repeated. Posting replies or resolving threads from the extension changes GitHub; use a test PR for those actions.

When changing authentication method, token, or host, reopen commands. Cached PR data, recent history, seen markers, and the inbox are reset when a credential change is detected, to avoid showing another credential's cached data. Tracking settings remain. The watcher establishes a fresh baseline.

## Develop and validate this integration locally

This folder is an isolated integration prototype based on the existing extension. `UPSTREAM.json` records its source commit. The original `gh-review-raycast` project and the published PR are not modified.

Use Node.js **22.22.2 or later**, as required by the installed Raycast API package.

```sh
cd /Users/vitoraguila/projects/github-review-requests-integration
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

`npm run dev` prepares `.local-preview` and imports **GitHub Review Requests (Local)** with a separate extension identity. Its preferences and storage are separate from the Store extension and your original GH Review extension. Search for the commands with the **GitHub Review Requests (Local)** subtitle. Select your authentication method in this local extension's preferences; existing credentials are not copied automatically.

Restart `npm run dev` after changing source files: it refreshes the preview copy. Edit files in `src/`, not `.local-preview/src/`. Stop the terminal process when finished and disable/remove the **Local** extension from Raycast settings if you no longer want it installed. Leave tracking disabled until you are ready to test it.

See [LOCAL_VALIDATION.md](LOCAL_VALIDATION.md) for the manual test checklist and remaining checks. The future PR wording is in [PR_DESCRIPTION.md](PR_DESCRIPTION.md); it has not been posted. `npm run dev:upstream` uses the real extension identity and is intended only for an intentional final integration test, since it can affect the installed extension's development version.
