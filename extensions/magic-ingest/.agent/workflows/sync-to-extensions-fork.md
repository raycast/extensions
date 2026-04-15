---
description: Sync raycast-photo-ingest to the dustchambers/extensions fork (for PR updates)
---

# Sync to Extensions Fork

The Raycast extensions monorepo is too large to clone (~83k objects). Use the `gh` CLI + GitHub Git API instead.

## Prerequisites
- `gh` CLI installed and authenticated (`gh auth status`)
- Changes committed and pushed to `dustchambers/raycast-photo-ingest`

## Steps

// turbo-all

1. Get the current branch HEAD SHA:
```bash
gh api repos/dustchambers/extensions/git/ref/heads/ext/magic-ingest --jq '.object.sha'
```

2. Run the push script (creates blobs, builds tree, commits, updates ref):
```bash
bash /tmp/push-to-fork.sh
```

If `/tmp/push-to-fork.sh` doesn't exist, recreate it — see below.

3. Verify on GitHub that the commit landed on the PR.

4. If the PR is in draft, click **"Ready for review"** on the PR page.

## Push Script Template

Save to `/tmp/push-to-fork.sh` if missing:

```bash
#!/bin/bash
set -e

OWNER="dustchambers"
REPO="extensions"
BRANCH="ext/magic-ingest"
PREFIX="extensions/magic-ingest"
LOCAL_DIR="/Users/dustintchambers/Documents/dev/raycast-photo-ingest"

HEAD_SHA=$(gh api "repos/$OWNER/$REPO/git/ref/heads/$BRANCH" --jq '.object.sha')
BASE_TREE=$(gh api "repos/$OWNER/$REPO/git/commits/$HEAD_SHA" --jq '.tree.sha')

TREE_ENTRIES='[]'

add_file() {
  local local_path="$1"
  local repo_path="$2"
  local ext="${local_path##*.}"
  if [[ "$ext" == "png" || "$ext" == "jpg" || "$ext" == "svg" ]]; then
    CONTENT_B64=$(base64 -i "$local_path")
    BLOB_SHA=$(echo "{\"content\":\"$CONTENT_B64\",\"encoding\":\"base64\"}" | \
      gh api "repos/$OWNER/$REPO/git/blobs" --method POST --input - --jq '.sha')
  else
    BLOB_SHA=$(jq -n --rawfile content "$local_path" '{"content":$content,"encoding":"utf-8"}' | \
      gh api "repos/$OWNER/$REPO/git/blobs" --method POST --input - --jq '.sha')
  fi
  echo "  $BLOB_SHA -> $repo_path"
  TREE_ENTRIES=$(echo "$TREE_ENTRIES" | jq \
    --arg path "$repo_path" --arg sha "$BLOB_SHA" \
    '. + [{"path":$path,"mode":"100644","type":"blob","sha":$sha}]')
}

echo "=== Uploading files ==="
while IFS= read -r file; do
  add_file "$file" "$PREFIX/${file#$LOCAL_DIR/}"
done < <(find "$LOCAL_DIR" -type f \
  -not -path "*/.git/*" -not -path "*/node_modules/*" \
  -not -path "*/dist/*" -not -path "*/.superpowers/*" \
  -not -name ".DS_Store" -not -path "*/docs/*" | sort)

echo "=== Checking deletions ==="
CURRENT_FILES=$(gh api "repos/$OWNER/$REPO/git/trees/$BASE_TREE?recursive=1" \
  --jq "[.tree[] | select(.path | startswith(\"$PREFIX/\")) | .path]")
while IFS= read -r repo_file; do
  local_file="$LOCAL_DIR/${repo_file#$PREFIX/}"
  if [ ! -f "$local_file" ]; then
    [[ "$repo_file" == *"node_modules"* || "$repo_file" == *".DS_Store" || "$repo_file" == *".superpowers"* ]] && continue
    echo "  DELETE: $repo_file"
    TREE_ENTRIES=$(echo "$TREE_ENTRIES" | jq --arg path "$repo_file" \
      '. + [{"path":$path,"mode":"100644","type":"blob","sha":null}]')
  fi
done < <(echo "$CURRENT_FILES" | jq -r '.[]')

echo "=== Creating commit ==="
NEW_TREE=$(echo "$TREE_ENTRIES" | jq --arg base "$BASE_TREE" \
  '{"base_tree":$base,"tree":.}' | \
  gh api "repos/$OWNER/$REPO/git/trees" --method POST --input - --jq '.sha')
NEW_COMMIT=$(jq -n --arg msg "Update magic-ingest extension" \
  --arg tree "$NEW_TREE" --arg parent "$HEAD_SHA" \
  '{"message":$msg,"tree":$tree,"parents":[$parent]}' | \
  gh api "repos/$OWNER/$REPO/git/commits" --method POST --input - --jq '.sha')
gh api "repos/$OWNER/$REPO/git/refs/heads/$BRANCH" --method PATCH \
  -f "sha=$NEW_COMMIT" --jq '.ref'
echo "=== Done! Commit: $NEW_COMMIT ==="
```

## Why Not Clone?

The `raycast/extensions` monorepo has 83k+ objects. Even `--depth=1 --single-branch` takes 10+ minutes (often longer on slow connections). The `gh` API approach uploads only your extension's files (~23 files, ~30 seconds).
