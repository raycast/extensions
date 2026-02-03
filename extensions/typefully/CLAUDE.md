# Typefully Raycast Extension

## Publishing

### How to publish

1. Make sure your fork of [raycast/extensions](https://github.com/raycast/extensions) is in sync with upstream. If it's out of sync, reset it:
   ```bash
   GITHUB_USER=$(gh api user --jq '.login')
   SHA=$(gh api repos/raycast/extensions/git/refs/heads/main --jq '.object.sha')
   gh api -X PATCH "repos/$GITHUB_USER/extensions/git/refs/heads/main" --field sha="$SHA" --field force=true
   ```
2. Run `npm run publish` — this opens a PR against `raycast/extensions`
3. If `pull-contributions` flags conflicts, resolve them keeping our code:
   ```bash
   git checkout --ours <files> && git add <files> && git merge --continue
   ```
4. Verify nothing broke: `npm run build`
5. Clean up leftover branches: `git branch -D contributions/merge-*`

### Links

- Raycast Store page: https://www.raycast.com/typefully/typefully
- Initial store PR: https://github.com/raycast/extensions/pull/25102
- Raycast publish docs: https://developers.raycast.com/basics/publish-an-extension
- Raycast extension guidelines: https://developers.raycast.com/basics/prepare-an-extension-for-store
