# Snap & Grab release checks

## Automated

- TypeScript selection and preference tests.
- Native selection/history/modifier/clipboard/HUD fixtures.
- Cross-process setup-failure retry: the original helper stays alive while a second process acquires its released capture lock.
- Cross-process multi-file clipboard transfer, including writer lifetime.
- Raycast lint and icon validation.
- Raycast production build, including packaged native executable.

Record actual results in the submission; do not infer manual checks from a green build.

## Local installation

1. Use Node 22.22.2 or newer and run `npm ci`, then `npm run dev`.
2. Find the development **Capture and Copy** command. Clear the old Script Command hotkey before assigning the same shortcut to this command.
3. Capture one area, then capture a window with Space. Cancel a capture with Escape.
4. Hold the chosen modifiers, capture once, add two earlier screenshots, and release. Paste into a chat draft and confirm three attachments appear; no message needs to be sent.
5. Run **Select Recent Screenshots**, toggle images with Return, and use the secondary Command+Return action to copy.
6. Test the folder preference, confirmation Off/Brief/Extended, and previews disabled.
7. Start another capture while the copied confirmation is visible. The previous HUD must disappear before it can enter the new screenshot.
8. Check any permission prompts using a clean account or machine, and test the distributed build on Intel and Apple Silicon before advertising both as tested.

## Store media

Use Raycast's built-in Capture Window command while the extension is open, and choose Save to Metadata. Capture the recent-selection browser with neutral sample images. Include a short demonstration of the held-shortcut selection HUD and confirmation. Do not include real messages, client work, account details, or other private content.

These checks can be performed manually without granting an agent computer-control access. Store approval and merge are handled by Raycast reviewers after submission.
