# Install and Publish FastNav for Raycast

This guide covers installing FastNav on another Mac, testing a local development build, and submitting the extension to the Raycast Store.

## Install From the Raycast Store

Use these steps after FastNav has been approved and published:

1. Install and open [Raycast](https://www.raycast.com/).
2. Open Raycast's **Store** command.
3. Search for **FastNav** and choose **Install Extension**.
4. Run **Search App Actions**.
5. If macOS asks for Accessibility access, choose **Request Accessibility Access**, open **System Settings → Privacy & Security → Accessibility**, and enable the item named in the prompt. Depending on the macOS and Raycast versions, it may appear as Raycast or FastNavBridge.
6. Return to Raycast and refresh the FastNav command.

FastNav searches visible interface elements by default. To confirm or change this, open **Raycast Settings → Extensions → FastNav**. The **Include visible buttons, links, tabs, rows, and controls** switch is on by default.

## Install a Local Build on Another Mac

Use this method before the Store release or while developing FastNav.

### Requirements

- macOS 14 or newer
- Raycast
- Node.js with npm
- Xcode 16.3 or newer
- The `raycast extension` folder from this project

### Steps

Open Terminal in the extension folder and run:

```sh
npm ci
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run build
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run dev
```

Wait for **built extension successfully**. FastNav will appear in Raycast under Development. Run **Search App Actions** and complete the Accessibility setup above.

Keep `npm run dev` running while actively editing the extension so Raycast receives updates. After a successful build, the development extension remains listed in Raycast.

## Publish to the Raycast Store

Raycast publishes community extensions through a pull request to the public [`raycast/extensions`](https://github.com/raycast/extensions) repository.

The publishing tool requires the extension to be inside a Git repository with all intended changes committed. For a first-time standalone extension repository, run:

```sh
git init
git add .
git commit -m "Prepare FastNav for the Raycast Store"
```

Before every later submission, commit your changes and confirm that `git status` is clean.

### 1. Check Store Metadata

Before submitting, verify:

- `author` in `package.json` is your Raycast username. FastNav currently uses `uriafranko`.
- `license` is `MIT`.
- `platforms` contains only `macOS`.
- `assets/icon.png` is a non-default 512 × 512 PNG that works in light and dark themes.
- `README.md`, `CHANGELOG.md`, `package-lock.json`, and all Swift sources are included.
- The FastNav preference appears in Raycast Settings and is on by default.

The generated native executable and build caches are intentionally ignored. Raycast Store CI rebuilds the native bridge from the included `swift` source using Raycast's official Swift tooling.

### 2. Run the Release Checks

From the extension folder:

```sh
npm ci
npm run typecheck
npm run lint
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run build
```

Then open the distribution build in Raycast and verify:

- **Search App Actions** opens without an error.
- At least one running application shows menu actions.
- **Raycast Settings → Extensions → FastNav** shows the visible-interface switch as on.
- Selecting an enabled action runs it in the target application.

### 3. Submit

Run:

```sh
npm run publish
```

The Raycast publishing tool will ask you to authenticate with GitHub and will open a Store pull request. Respond to review feedback in that pull request. When Raycast merges it, FastNav is published automatically.

Running `npm run publish` again updates the open submission pull request when you need to send review fixes.

### Optional Store Screenshots

Raycast recommends adding Store screenshots. In Raycast's Advanced settings, configure **Window Capture**, open FastNav in development mode, capture the most useful states, and choose **Save to Metadata**. Use a consistent background and do not include private information.

## Files That Should Not Be Submitted

Do not commit generated or machine-specific files:

- `node_modules/`
- `dist/`
- `raycast-env.d.ts`
- `swift/.raycast-swift-build/`
- `assets/compiled_raycast_swift/`
- `Package.resolved`

These paths are covered by `.gitignore`.
