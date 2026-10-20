<div align="center">
  <img
    src="./assets/bitbucket-logo.png"
    width="50"
  />

  <h1>
    Bitbucket
  </h1>

Raycast extension to search repositories, check pipelines status, open recent Pull Requests, and more to come.

  <p>
    <a href="https://www.raycast.com/francois/bitbucket">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://open.vscode.dev/organization/repository">
      <img
        src="https://open.vscode.dev/badges/open-in-vscode.svg"
        alt="Open in Visual Studio Code"
      />
    </a>
  </p>
</div>

![showcase](./assets/showcase.gif)

## Features

- Quick access to your repositories
- Search your recent pipelines and see their status
- See your recent open pull requests
- Get Bitbucket notifications in the menu bar (see below)

## Notifications

The **Notifications** menu bar command shows a count of unread notifications and lists them in the menu. Bitbucket Cloud has no notifications API, so they are derived from your pull requests and repository activity of the last 7 days:

- Review requested from you on a pull request
- Approvals and requested changes on your pull requests
- Comments on pull requests you authored or review, and `@` mentions of you there
- Your pull requests that were merged or declined
- Pipelines you started that failed

Click a notification to open it (this also marks it as read), hold <kbd>⌥</kbd> to only mark it as read, or use **Mark All as Read**. Read state is stored locally. If some repositories fail to load (for example because the API token lacks a scope), the menu says that the list may be incomplete.

The command refreshes every 15 minutes and sends a few requests per repository. On large workspaces, lower **Max Repository Age (Days)** in the command preferences (default 30) to skip dormant repositories. You can also hide the menu bar item when there is nothing new (**Always Show**) and toggle the count (**Show Notification Count**).

## Getting started

- [Generate a Bitbucket API token](https://id.atlassian.com/manage-profile/security/api-tokens) with `read:*` scopes, or narrow to:
  - read:workspace:bitbucket
  - read:user:bitbucket
  - read:repository:bitbucket
  - read:pullrequest:bitbucket
  - read:pipeline:bitbucket (needed for pipeline status and failed-pipeline notifications)
  - write:pullrequest:bitbucket (needed to approve, decline, or request changes on pull requests)
- Start a bitbucket command and fill the required fields:
  - Workspace: You can see your workspaces [here](https://bitbucket.org/account/workspaces/), and use the slug. You can find it in the URL of your workspace: `https://bitbucket.org/{organization}/`
  - Account email
  - API token

Now you should be able to run Bitbucket commands with Raycast 🚀.

## Roadmap

- [x] Use the Bitbucket Client NPM package instead of hardcoding the API
- [x] Show commit name in pipelines title
- [x] Addd pagination navigation to pipelines
- [ ] Dashboard with overview of differents queries (PRs, pipelines, etc)
- [ ] Extend pipelines capabilities to see logs & rerun a failed/stopped one
- [ ] Test performances with high number of repositories (only tested with 38 until now). And if bad performances, check:
  - [ ] Add pagination navigation to repositories
  - [ ] Load all repos in background and keep a cache of all of them (as repositories are quite static resources)
  - [ ] Only keep the field needed, to reduce JSON answer size

---

_Extension built & tested for Bitbucket Cloud_

Bitbucket API resource: https://developer.atlassian.com/cloud/bitbucket/rest/intro/

Bitbucket Client API resource: https://bitbucketjs.netlify.app/
