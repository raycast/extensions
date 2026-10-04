# Learn

Collect, browse, and organize resources in local [Learn](https://github.com/Humanive/Learn) workspaces. Save the current browser tab in one step, add URLs or local paths with titles and tags, and find your collected resources without leaving Raycast.

Saving adds a pending resource. Start ingestion separately from the resource list's action menu when you want local content. Ingestion runs in Terminal, where you can read logs and interrupt it.

## Requirements

- macOS and Raycast.
- A browser connected to the [Raycast Browser Extension](https://www.raycast.com/browser-extension).
- A compatible Learn CLI that supports `new`, `list --json`, `<workspace> ls --json`, `add`, `tag`, `rm`, and `ingest`. Ordinary tag editing works with published 0.1.0. Removing tags named `w` or `-workspace` requires the latest CLI's literal operand support; the extension checks compatibility before attempting those changes.

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
4. On your first capture, choose a Learn workspace or create one to save the tab. Later captures reuse that workspace while it still exists.

Use **Create Workspace and Save Tab** (`⌘N`) in the workspace picker to create a new destination without losing the captured browser tab.

An existing URL is reported as **Already saved**. New captures remain pending until you ingest them:

```bash
learn ingest --workspace browser-agents
```

### Browse Learn Resources

Choose a workspace to see resources and counts for pending, ingested, and failed entries. Search matches titles, original URLs/paths, and tags. The status dropdown filters quickly; **Filter Resources** (`⌘F`) combines status, type, and an exact, case-sensitive tag. Search and all selected filters apply together. This searches resource metadata, not the full text of ingested documents.

The resource action menu (`⌘K`) lets you:

- Open the original URL/path, open ingested content, or show it in Finder.
- View resource details and copy the original URL/path.
- Edit tags, including clearing all tags.
- Remove a resource while keeping its content, or remove it and delete its ingested content. Both removal actions ask for confirmation. Content deletion is available only for outputs inside the workspace.

Workspace actions include **Add Resource** (`⌘N`), **Reload Resources** (`⌘R`), opening the workspace folder, and selecting it for browser capture. The empty resource list offers the same workspace actions.

**Ingest Pending Resources in Terminal** starts the CLI's normal ingestion. If Learn has a default agent configured, its usual agent handoff applies. **Ingest with Agent in Terminal** explicitly selects `claude`, `codex`, or `pi` and includes previously failed resources. You can also copy the ingestion command. After ingestion completes, reload resources to see the final statuses; opening Terminal alone does not mean ingestion succeeded. macOS may ask to allow Raycast to control Terminal.

### Add Learn Resource

Choose a workspace and paste an HTTP/HTTPS URL, repository URL, or absolute local path. `~/` paths are expanded to your home folder. Optionally set a title and comma-separated tags. **Create Workspace** is available in the action menu without discarding your form. The saved capture destination is selected by default when available. Adding a resource does not change that capture destination or start ingestion.

The Raycast Browser Extension is needed only for **Save Current Browser URL**; manual addition and resource browsing work without it.

### Choose Learn Workspace

Choose the workspace that later captures will use. Use **Create Workspace** (`⌘N`) to add a workspace. The empty state offers creation directly.

### Create Learn Workspace

Enter a workspace name to create it through the Learn CLI. The extension selects the new workspace for future browser captures. Existing or reserved names are reported by the CLI; names cannot contain path separators.

## Troubleshooting

- **Duplicate commands under Learn and Learn Browser Capture:** two development registrations are enabled. In Raycast Settings, search for **Learn Browser Capture** and disable the old two-command extension. Keep **Learn** enabled. This does not remove learning workspaces or resources.
- **No Learn workspace found:** use **Create Learn Workspace** or create one from the workspace picker's empty state.
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
