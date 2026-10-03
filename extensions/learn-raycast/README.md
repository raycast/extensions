# Learn Browser Capture

Save the current browser URL and page title to a local [Learn](https://github.com/Humanive/Learn) workspace. The extension remembers your selected workspace so that later captures only ask you to choose a tab when multiple browser windows are active.

Each capture adds a pending resource to the workspace's `resources.json`. Run the Learn CLI's `ingest` command separately when you want to download and convert the collected resources.

## Requirements

- macOS and Raycast.
- A browser connected to the [Raycast Browser Extension](https://www.raycast.com/browser-extension).
- A compatible Learn CLI that supports `list --json` and `add --workspace --title`.
- At least one Learn workspace.

## Set Up the Learn CLI

Install `@humanive/learn-cli` with Node.js 24:

```bash
npm install -g @humanive/learn-cli
learn new browser-agents
learn list --json
command -v learn
```

Use the path from `command -v learn` in the **Learn Executable** preference, or keep the default `learn` if it is on Raycast's PATH. Do not install the unrelated unscoped packages `learn` or `learn-cli`.

For development, you can also build the CLI from a Learn checkout that includes the Raycast integration. Install Git, Node.js 24, and pnpm 12.6.0, then clone Learn and build its CLI:

```bash
git clone https://github.com/Humanive/Learn.git
cd Learn
pnpm install --frozen-lockfile
pnpm -r --filter @humanive/learn-core --filter @humanive/learn-cli build
chmod +x apps/cli/dist/cli.js

node apps/cli/dist/cli.js new browser-agents
node apps/cli/dist/cli.js list --json

# Copy this absolute path into the Learn Executable preference.
node -e 'console.log(process.cwd() + "/apps/cli/dist/cli.js")'
```

`list --json` should print a JSON array containing your workspace name. Keep the checkout and its dependencies in place: the compiled CLI depends on the other installed packages in the repository.

In Raycast's extension preferences, set **Learn Executable** to the absolute path printed above. This preference accepts an executable file path; use a full path instead of `~` or a command such as `node /path/to/cli.js`.

The CLI requires Node to be available in Raycast's PATH. Homebrew's standard locations (`/opt/homebrew/bin` and `/usr/local/bin`) are included automatically. If Node is installed only through a shell version manager, configure an executable wrapper that uses the absolute Node path and executes the CLI with its arguments, then point **Learn Executable** to that wrapper.

## Connect Your Browser

Install the Raycast Browser Extension in your browser and complete its setup. Raycast can prompt you to install it when the command first requests browser tabs.

This extension reads tabs exclusively through `BrowserExtension.getTabs()`. Use a browser supported by Raycast's browser integration. The local application filter accepts Safari, Google Chrome, Google Chrome Canary, Arc, Aside, Brave Browser, Microsoft Edge, Vivaldi, Opera, and Chromium, but appearing in that filter alone does not guarantee that the Raycast browser integration supports that browser. Firefox is not currently accepted by the extension.

Only HTTP and HTTPS pages can be saved. Browser settings pages, new-tab pages, and local files are not supported.

## Commands

### Save Current Browser URL

1. Bring your browser to the foreground and open the page you want to save.
2. Launch **Save Current Browser URL** in Raycast.
3. If multiple browser windows have active tabs, choose the tab to save.
4. On your first capture, choose a Learn workspace. Later captures reuse that workspace while it still exists.

An existing URL is reported as **Already saved**. New captures remain pending until you ingest them:

```bash
learn ingest --workspace browser-agents
```

### Choose Learn Workspace

Choose the workspace that later captures will use. Create workspaces with the CLI's `new` command before selecting one here.

## Troubleshooting

- **No Learn workspace found:** create a workspace using the setup commands above.
- **Learn returned an invalid workspace list:** check that your CLI supports `list --json` and prints a JSON array without extra output.
- **The Learn executable cannot be found:** set **Learn Executable** to an absolute path and ensure the file is executable.
- **Node cannot be found:** check the Node PATH requirement in the CLI setup section.
- **No active browser tab found:** check that the browser is connected to Raycast and has an active HTTP/HTTPS tab.
- **Switch to a supported browser:** bring an accepted browser to the foreground before invoking the command.

## Data

The extension passes the selected URL and page title to the local Learn CLI. Learn records them in the selected workspace, under `~/Learn` by default. Raycast LocalStorage holds the selected workspace name. The extension does not upload captured resources to a remote service; any later ingestion uses the adapters configured in Learn.

## Development

Inside the Learn monorepo:

```bash
pnpm --filter learn-raycast develop
pnpm --filter learn-raycast build
pnpm --filter learn-raycast test
pnpm --filter learn-raycast lint
```

In a standalone extension checkout, use `npm ci` followed by `npm run build`, `npm test`, and `npm run lint`. The extension includes its own npm lockfile for Raycast Store CI.
