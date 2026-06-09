# Windows and WSL Development Workflow

This project can use two checkouts:

- WSL checkout: where source edits and commits can happen.
- Windows checkout: where Raycast for Windows imports and runs the extension.

This avoids sharing platform-specific dependency output between Linux and Windows.

## One-Time WSL Setup

From WSL:

```bash
cd ~/coding/raycast/raycast-fmhy-search
npm install
npm run build
git status
```

After the GitHub repository exists, connect this checkout to it:

```bash
git remote add origin git@github.com:<your-username>/raycast-fmhy-search.git
git push -u origin main
```

If the remote already exists:

```bash
git remote -v
git push
```

## One-Time Windows Setup

From Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path $HOME\Coding\Raycast
cd $HOME\Coding\Raycast
gh repo clone <your-username>/raycast-fmhy-search
cd raycast-fmhy-search
npm install
npm run dev
```

Keep the `npm run dev` process running while testing in Raycast. Use Raycast root search to open `Search FMHY`; refresh the cache from its action menu.

On Windows, always use `npm run dev` for this project. The script runs `scripts/develop.cjs`, which preloads `scripts/raycast-windows-protocol.cjs` so Raycast CLI dev notifications use the registered `raycast://` protocol instead of an unhandled `raycast-x://` link. The protocol patch must not rewrite Raycast's local dev storage location.

## Daily Loop

In WSL:

```bash
git pull
npm install
npm run build
git status
git add .
git commit -m "Describe the change"
git push
```

In Windows PowerShell:

```powershell
cd $HOME\Coding\Raycast\raycast-fmhy-search
git pull
npm install
npm run dev
```

## Pulling Safely

Before pulling on either checkout:

```bash
git status
```

Commit or stash local work before `git pull` if there are modified files you care about. Avoid editing the same file in both checkouts at the same time.

## Dependency Rule

Never copy `node_modules` between WSL and Windows. If dependencies change, run `npm install` independently in each checkout.

## Windows Stale Command Registry

If Raycast keeps showing an old command after `npm run dev`, first verify the compiled bundle under:

```powershell
$env:USERPROFILE\.config\raycast-x\extensions\fmhy-search
```

Back up Raycast state before any targeted reset. If a reset is needed, rename rather than delete these paths:

```powershell
$env:LOCALAPPDATA\Raycast\extensions\fmhy-search
$env:LOCALAPPDATA\Raycast\index
$env:LOCALAPPDATA\Raycast\node_extensions.db*
```
