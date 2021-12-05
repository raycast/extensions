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

## Features

- Quick access to your repositories
- Search your recent pipelines and see their status
- Open your recent pull requests

## Getting started

- Go to to your Bitbucket Cloud profile, [under App Passwords](https://bitbucket.org/account/settings/app-passwords/)
- Click on `Create App Password`
- Give your App password a name e.g. `Raycast`, and select all the read options (_to be improved_)
- Store in a secure location the given App Password
- Start a bitbucket command and fill the required fields:
    - Workspace: You can see your workspaces [here](https://bitbucket.org/account/workspaces/), and use the slug. You can find it in the URL of your workspace: `https://bitbucket.org/{organization}/`
    - Account Name: You can find it [here](https://bitbucket.org/account/settings/) under `Bitbucket profile settings > Username`
    - App Password

Now you should be able to run Bitbucket commands with Raycast 🚀.

## Showcases

### List Repositories

![search-repossitories](./assets/showcase_search_repositories.png)

## Roadmap

- Use the bitbucket NPM package instead of hardcoding the API
- Dashboard with a recap
- Find commit name

__________


_Extension built & tested for Bitbucket Cloud_

Api resource: https://developer.atlassian.com/cloud/bitbucket/rest/intro/
