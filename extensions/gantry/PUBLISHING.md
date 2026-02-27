# Publishing Gantry to the Raycast Store

## Pre-Submission Checklist

### Required Fixes

- [ ] **Add `platforms` field to package.json**
  Add `"platforms": ["macOS"]` (since Gantry manages launchd, it's macOS-only)

- [ ] **Create `metadata/` folder with screenshots**
  - At least 1 screenshot, ideally 3-6
  - Size: **2000 x 1250 pixels** (16:10 landscape)
  - Format: PNG
  - Place in `metadata/` at the project root
  - Naming: `metadata/gantry-1.png`, `metadata/gantry-2.png`, etc.

  **Tips for screenshots:**
  - Use Raycast's built-in Window Capture or the [Capture Raycast Metadata](https://www.raycast.com/koinzhang/capture-raycast-metadata) extension
  - Show: job list, detail panel, schedule editor, log viewer, live tail
  - Use consistent backgrounds, avoid sensitive data
  - A [Figma template](https://www.figma.com/community/file/1083160585697279319/raycast-extension-screenshot-template) is available

- [ ] **Add `publish` script to package.json**
  ```json
  "publish": "npx @raycast/api@latest publish"
  ```

### Recommended Fixes

- [ ] **Fix README.md placeholder URL** (line 10)
  Replace `yourusername` with your actual GitHub username

- [ ] **Replace extension icon with your logo**
  Copy your logo to `assets/extension-icon.png` (must be 512x512 PNG).
  Optionally add `assets/extension-icon@dark.png` for light backgrounds.
  Use [icon.ray.so](https://icon.ray.so/) to generate properly formatted icons.

- [ ] **Add CHANGELOG.md**
  ```markdown
  ## [Initial Version] - 2026-02-27

  - Browse all launchd services grouped by source
  - Filter by health status
  - Inline detail panel with job metadata and recent logs
  - Run jobs on demand
  - Edit cron schedules with live preview
  - Natural language schedule input
  - AI-powered log summaries (Claude, Gemini, GPT)
  - Live tail logs
  - Toggle Apple service visibility
  ```

- [ ] **Add LICENSE file**
  Create a standard MIT license file (package.json already declares MIT)

## Validation

Run these commands and confirm they all pass:

```sh
npm run build    # Must succeed with zero errors
npm run lint     # Must pass clean
npx tsc --noEmit # Must have zero type errors
```

All three currently pass clean.

## How Raycast Store Publishing Works

Raycast extensions are published through the [raycast/extensions](https://github.com/raycast/extensions) GitHub monorepo. You don't publish to npm — you submit a PR to their repo.

### Step-by-Step Submission

1. **Verify everything passes:**
   ```sh
   npm run build && npm run lint
   ```

2. **Run the publish command:**
   ```sh
   npm run publish
   ```
   This will:
   - Authenticate you with GitHub (opens browser)
   - Fork `raycast/extensions` to your account (if needed)
   - Copy your extension into `extensions/gantry/`
   - Automatically open a PR to the `main` branch

3. **Alternative: Manual submission**
   - Fork [raycast/extensions](https://github.com/raycast/extensions)
   - Add your extension directory under `extensions/gantry/`
   - Open a PR to `main`

4. **Wait for review**
   - Raycast reviews PRs in FIFO order
   - First contact within ~1 week
   - Respond to feedback promptly

5. **Iterate on feedback**
   - Push additional commits to the same PR branch
   - PRs go stale after 14 days of inactivity
   - PRs are closed after 21 days of inactivity

6. **Merge = Published**
   Once the PR is merged, your extension is live in the Raycast Store.

## Review Criteria

Raycast reviewers check for:

- **Functionality** — extension works, handles errors gracefully
- **Uniqueness** — doesn't duplicate existing extensions or native Raycast features
- **Code quality** — clean code, proper error handling, no unnecessary deps
- **UX** — follows Raycast design patterns, proper loading states, toast notifications
- **Documentation** — clear README especially for API key setup
- **License** — must be MIT (already set)
- **Assets** — custom icon (not default), screenshots in metadata/

### Common Rejection Reasons

- Using the default Raycast icon
- Missing screenshots in `metadata/`
- Missing `package-lock.json` (they use npm in CI)
- Duplicating an existing extension
- Poor error handling or missing loading states
- Using `dotenv` or similar (use Raycast Preferences API instead — already done)
- Bundling opaque binaries

## Package.json Requirements

| Field | Current | Status |
|-------|---------|--------|
| `name` | `"gantry"` | OK |
| `title` | `"Gantry"` | OK |
| `description` | Present | OK |
| `icon` | `"extension-icon.png"` | OK |
| `author` | `"eli_collinson"` | OK |
| `categories` | `["Developer Tools", "System"]` | OK |
| `license` | `"MIT"` | OK |
| `commands` | 1 command defined | OK |
| `preferences` | 5 preferences | OK |
| `platforms` | **Missing** | Add `["macOS"]` |

## Asset Requirements

| Asset | Requirement | Status |
|-------|-------------|--------|
| Extension icon | 512x512 PNG in `assets/` | Exists (consider replacing with new logo) |
| Screenshots | 2000x1250 PNG in `metadata/` | **Missing — must create** |

## Post-Submission

After your extension is live:

- **Updates:** Run `npm run publish` again to submit update PRs
- **CHANGELOG.md:** Keep it updated — it shows version history in the Store
- **User feedback:** Monitor GitHub issues on the raycast/extensions repo

## Useful Links

- [Raycast Developer Docs](https://developers.raycast.com/)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Prepare for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Extension Guidelines](https://manual.raycast.com/extensions)
- [Icon Generator](https://icon.ray.so/)
- [Screenshot Figma Template](https://www.figma.com/community/file/1083160585697279319)
- [raycast/extensions repo](https://github.com/raycast/extensions)
