# Upload this extension as a GitHub repo

You asked to add GitHub upload to the steps. Two paths: private quick-use (no GitHub needed) vs public Store path (GitHub required).

## A. Use privately (recommended for v1 — no GitHub needed)

1. `npm install && npm run dev`
2. Raycast → `Import Extension` → pick `/Users/Apple/Desktop/launchbar-file-manager`
3. Done. Extension stays local.

Skip GitHub entirely unless you want backup/sharing/Store.

## B. Push to GitHub (backup + share + Store prerequisite)

### 1. Init git locally (already done if you ran the setup)

```bash
cd ~/Desktop/launchbar-file-manager
git init -b main
git add .
git commit -m "feat: LaunchBar-style file manager for Raycast"
```

### 2. Create empty repo on GitHub

- Go to https://github.com/new
- Name: `launchbar-file-manager` (or `raycast-launchbar-file-manager`)
- Visibility: **Public** if you ever want Raycast Store; **Private** if just backup.
- Do NOT tick “Add README” (we already have one).
- Copy the `...or push an existing repository` commands.

### 3. Push

```bash
git remote add origin git@github.com:<YOUR_USER>/launchbar-file-manager.git
# or: https://github.com/<YOUR_USER>/launchbar-file-manager.git
git push -u origin main
```

If `gh` CLI is installed, one-liner instead:

```bash
gh repo create launchbar-file-manager --public --source=. --remote=origin --push
# private: --private
```

### 4. Keep Desktop copy or move?

GitHub is now the source of truth. You can:
- Leave folder on Desktop for quick dev, or
- `mv ~/Desktop/launchbar-file-manager ~/code/launchbar-file-manager` and re-import in Raycast (`Manage Extensions` → remove old → `Import Extension` new path).

### 5. Should you publish to Raycast Store?

**No for v1.** Stay on `Import Extension`. Publish only if you want public discovery.

Store publish checklist (when ready):
1. `npx ray lint` clean, `npx ray build -e dist` passes
2. `assets/icon.png` 512×512, README + screenshots
3. Repo must be public under `raycast/extensions` fork OR personal with `ray publish`
4. `npx ray publish` → review queue (days) → updates via PR

### 6. Update flow after GitHub push

```bash
cd ~/Desktop/launchbar-file-manager
# edit, then:
npm run dev   # test
git add -A && git commit -m "fix: ..."
git push
```
