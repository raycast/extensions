# How to Resolve Merge Conflicts

If you're in the `raycast-extensions` repository with conflicts in `extensions/wubi/`, follow these steps:

## Quick Resolution (Accept Current Version)

Run these commands from the root of your `raycast-extensions` repository:

```bash
# Navigate to the conflicted extension
cd extensions/wubi

# Resolve text file conflicts by accepting current version (ours)
git checkout --ours package.json
git checkout --ours package-lock.json  
git checkout --ours CHANGELOG.md

# Resolve binary file conflicts (screenshots) - accept current version
git checkout --ours assets/screenshot-1.png
git checkout --ours assets/screenshot-2.png
git checkout --ours assets/screenshot-3.png

# Stage all resolved files
git add package.json package-lock.json CHANGELOG.md
git add assets/screenshot-*.png

# Complete the merge
git commit
```

## Alternative: Accept Incoming Version

If you want to accept the incoming changes instead, use `--theirs`:

```bash
git checkout --theirs package.json
git checkout --theirs package-lock.json
git checkout --theirs CHANGELOG.md
git checkout --theirs assets/screenshot-*.png
git add .
git commit
```

## Manual Resolution

If you need to manually edit conflicts:

1. Open each conflicted file
2. Look for conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
3. Choose which version to keep or merge them manually
4. Remove the conflict markers
5. Save the file
6. Run `git add <file>` for each resolved file
7. Run `git commit` to complete the merge

## Note

The `package-lock.json` in this directory (`wubi-input-query`) has been fixed to use the official npm registry (`registry.npmjs.org`). You may want to copy that fixed version to your `extensions/wubi/package-lock.json` after resolving conflicts.

