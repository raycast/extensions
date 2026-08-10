<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/gitlab/assets/gitlab.png?raw=true"
    width="50"
  />

  <h1>
    GitLab
  </h1>

Raycast extension to create, search and modify issues, manage merge requests, projects and more.

  <p>
    <a href="https://www.raycast.com/tonka3000/gitlab">
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
    <a href="https://twitter.com/intent/follow?screen_name=tonka_2000">
      <img
        src="https://img.shields.io/twitter/follow/tonka_2000.svg?label=Follow%20@tonka_2000"
        alt="Follow @tonka_2000"
      />
    </a>
    <a href="https://open.vscode.dev/organization/repository">
      <img
        src="https://open.vscode.dev/badges/open-in-vscode.svg"
        alt="Open in Visual Studio Code"
      />
    </a>
  </p>
</div>

## Features

- Manage your issue
- Manage your assigned issues
- Manage your GitLab todos
- Manage your projects
- Manage your epics
- Manage your merge requests
- Manage your reviews
- Search other users

and many more

## Authentication

The extension supports two authentication methods, selectable in the GitLab preferences via `Authentication`:

1. **Personal Access Token** (default). Simple, ideal for `gitlab.com` and instances without rotation.
2. **OAuth (PKCE)**. Recommended for enterprise instances that revoke or rotate Personal Access Tokens. Tokens are stored encrypted by Raycast and refreshed automatically; the browser flow runs only on first use and when the refresh token is revoked.

### Option A: OAuth (recommended for enterprise / token-rotating instances)

1. Open your GitLab instance (e.g. `https://gitlab.com` or your self-hosted URL).
2. Go to `Preferences` > `Applications` and click `Add new application`.
3. Fill in the form:
   - **Name**: `Raycast GitLab` (or any label).
   - **Redirect URI**: paste both lines below, one per line. GitLab does exact matching, and Raycast may use either form depending on the version, so registering both avoids "redirect URI is not valid" errors.
     ```
     https://raycast.com/redirect?packageName=Extension
     https://raycast.com/redirect/extension
     ```
   - **Confidential**: leave **unchecked**. Raycast is a public client and authenticates via PKCE.
   - **Scopes**: tick `api`, `read_user`, and `read_repository`. The extension always requests these three.
4. Save and copy the **Application ID**.
5. In Raycast, open the GitLab extension preferences:
   - Set **GitLab URL** to your instance.
   - Set **Authentication** to `OAuth (PKCE)`.
   - Paste the Application ID into **OAuth Application ID**.
6. Run any GitLab command. Your browser opens once for authorization. After that the extension refreshes access tokens automatically and re-authorizes only if the refresh token is revoked.

To sign out (e.g. to switch accounts), run the **Sign out of GitLab** command. This clears the locally cached OAuth tokens; the next GitLab command will trigger a fresh authorization flow.

### Option B: Personal Access Token

- Go to your GitLab instance e.g. https://gitlab.com
- Click on your avatar image in the right upper corner
- Click on `Edit profile`
- Click on `Access Tokens` on the left sidebar
- Give your token a name e.g. `raycast` and set an expiration date (highly recommended)
- Select your scope of choice

  You need at least `read_api`. When you want to make write operation via raycast, you should use `api`

- Store the given access token in a secret box because GitLab want show you the key again
- Go to the preferences in Raycast (or start any command of GitLab extension)
- Set your GitLab instance url

  For gitlab.com this would be `https://gitlab.com`.
  Your own instance could be `https://mygitlab.org`.

- Set the token from the previous step into the `API Token` field

Now you should be able to manage your GitLab instance with Raycast 🚀.

> **Tip**: If your instance auto-revokes Personal Access Tokens (e.g. nightly), use OAuth instead. The Application ID is permanent; access tokens are minted from a long-lived refresh token, so you re-authorize only when the refresh token itself is revoked.

## API Token/Personal Access Token scope

For all read only commands the `read_api` scope is enough. If you want to create/modify e.g. an issue you need
the `api` scope.

## Self-hosted instance

If you use a self hosted instance make sure that you set your custom CA certificate in the preferences.
This can be a tricky process and you need to make sure that you use the right certificate otherwise you get an error. The extension use your certificate and pass it directly to nodejs network stack. If you have troubles checkout various nodejs guides around the internet or checkout the [official nodejs documentation](https://nodejs.org/api/https.html#httpscreateserveroptions-requestlistener).

You can disable certificate errors, but this is not recommended for security reasons ⚠️.

## Showcases

### Todos

![todos](https://user-images.githubusercontent.com/3163807/138604198-6afbc93b-c263-4c03-812a-fc77b63d23a1.png)

### My Open Issues

![issues](https://user-images.githubusercontent.com/3163807/138604241-80629c99-6b86-4034-86ad-9400610b6350.png)

### My Groups

![groups](https://user-images.githubusercontent.com/3163807/138604274-f25a935c-50da-435f-b332-a9a72217e6e6.png)

### Epics

![epcis](https://user-images.githubusercontent.com/3163807/138604310-c6292899-232f-4902-a170-f5f93db9c998.png)
