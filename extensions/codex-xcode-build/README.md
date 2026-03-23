# Run Codex Repo in Xcode

Run the repo currently focused in Codex in Xcode.

## Requirements

- The Codex desktop app must be installed.
- Xcode must be installed.
- The repo you want to run should be open in Codex.
- On first use, macOS may ask you to allow Raycast to control Xcode and Codex.

## How it works

1. Looks at the repo currently focused in the Codex app.
2. Finds the closest Xcode project for that repo.
3. Opens it in Xcode.
4. Starts a run in Xcode.

## Behavior

- If the repo focused in Codex has an Xcode project nearby, the command opens it in Xcode and runs it.
- If Codex isn't focused on a repo, you'll see an error message.
- If no nearby Xcode project can be found, you'll see an error message.

## Configuration

The command includes a `Return to Codex` preference in Raycast command preferences.

- Leave it on if you want the command to briefly switch to Xcode to start the run, then return you to Codex.
- Turn it off if you want to stay in Xcode after the run starts.

## Notes

- The Xcode project it opens can be inside the repo or in a parent folder.
- It works with Xcode workspaces, projects, and Swift packages.
- To start a run, the command briefly brings Xcode to the foreground.

## Troubleshooting

- If the wrong project opens, switch back to the repo you want in Codex and try again.
- If nothing happens in Xcode on first run, check macOS Automation permissions for Raycast.
- If the repo doesn't have an Xcode workspace, project, or `Package.swift` nearby, the command won't guess. It will show an error instead.
