# Raycast Store Publishing Checklist

This folder is prepared as the first public release candidate of Open WebUI Web Clipper.

## Required Before Submission

1. **Confirm the `author` field in `package.json`.** It must exactly match your Raycast Store username. It is currently set to `d0xin`.
2. Run `npm install`. Raycast requires npm and a committed `package-lock.json` for Store submissions.
3. Run `npm run lint` and fix every reported issue.
4. Run `npm run build` and test the distribution build in Raycast.
5. Test all three commands against a clean Open WebUI account/configuration.
6. Test the 512×512 icon in both Raycast light and dark themes.
7. Capture Store screenshots using Raycast Window Capture with **Save to Metadata** enabled. Raycast recommends at least three 2000×1250 PNG screenshots. Keep screenshots focused on Raycast itself and do not include API keys or private content.
8. Run `npm run publish`. Raycast will authenticate with GitHub and open a pull request to `raycast/extensions`.

## Suggested Store Screenshots

1. **Send Web Content** form with the Capture, Action, Folder, Model, and Prompt controls visible.
2. **Send Web Content** configured for `Append to Existing Chat` to demonstrate chat integration.
3. Raycast root search showing the three commands: **Send Web Content**, **Save Page**, and **Save Selection**.

## Compatibility Check

The current implementation uses Open WebUI file, folder, chat, model, title-task, and chat-completion endpoints from the Open WebUI 0.11.x API. Re-test against the Open WebUI version you intend to list as supported immediately before submission.
