# PromptCast Publication Checklist

## Automated Checks

Run these commands from the extension root before every submission:

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

All five commands must finish without errors from the extension source or manifest.

## Manifest

- Confirm that `author` exactly matches the Raycast Store username that will submit the extension.
- Keep the Raycast API on its latest stable version.
- Keep `platforms` restricted to macOS because PromptCast uses PTYs, AppleScript, and macOS applications.
- Keep the MIT license, `package-lock.json`, Developer Tools category, and clear command titles.
- Record the Claude Code, Codex CLI, `tmux`, Raycast, macOS, Apple Silicon, and Intel versions used for the final manual test pass in the pull-request description.
- Do not run `npm publish`; use `npm run publish` to create the Raycast Store pull request.

## Store Review Notes

- PromptCast provides live control of a real shared CLI process, startup and permission controls, usage, MCPs, skills, and editor integration. State this clearly in the pull-request description to distinguish it from extensions that only search saved Claude Code or Codex conversations.
- PromptCast requires `node-pty` native files from the declared npm dependency for Apple Silicon and Intel. Include the provenance below in the pull-request description. A Raycast team member must independently copy, verify, and add the binary files during Store review.
- `npm audit --omit=dev --audit-level=high` currently passes. npm may still report the Raycast SDK's low-severity `esbuild` advisory for the Windows development server; PromptCast is macOS-only. Do not use `npm audit fix --force`, because npm currently resolves it by downgrading `@raycast/api` incompatibly.

### Store Differentiation

- [Vibelet Search](https://www.raycast.com/leyang/vibelet-search) searches and resumes stored Claude and Codex sessions. PromptCast additionally embeds and controls the real live TUI, shares one PTY across applications, and manages runtime models, permissions, startup profiles, MCPs, and skills.
- [ClaudeCast](https://www.raycast.com/qazi0/claudecast) focuses on Claude Code discovery and automation. PromptCast's core workflow is provider-neutral live terminal control for both Claude Code and Codex CLI.
- Agent Usage Monitor and Agent Ecosystem Map cover usage or configuration inventory as standalone workflows. PromptCast exposes those controls only as supporting parts of the active Claude/Codex terminal workflow.
- Describe PromptCast as one cohesive live-CLI control surface, not as a collection of unrelated utility commands.

### Native Binary Provenance

- Package: `node-pty@1.1.0`
- Registry tarball: `https://registry.npmjs.org/node-pty/-/node-pty-1.1.0.tgz`
- npm integrity: `sha512-20JqtutY6JPXTUnL0ij1uad7Qe1baT46lyolh2sSENDd4sTzKZ4nmAFkeAARDKwmlLjPx6XKRlwRUxwjOy+lUg==`
- `assets/node-pty/darwin-arm64/pty.node`: `e6457d66f45af3facd02920a5b212164e80fe0bb758afe6e6eab1eceeba3fc9a`
- `assets/node-pty/darwin-arm64/spawn-helper`: `21c589109bca43e287df884f3c34ab888033a83927ea7d273949ac5030583f26`
- `assets/node-pty/darwin-x64/pty.node`: `edab585d5c5c7bf35143a7a53b7d72652e90723b5f9635dfd55b2333f7069198`
- `assets/node-pty/darwin-x64/spawn-helper`: `46a4455777c6122d7e71cd706ea4b37b19bedd297684be8b6dabb833ff2a3965`

A Raycast team member should compare these four files with `node_modules/node-pty/prebuilds` after a clean `npm ci`, confirm every hash, and add them in a Raycast-owned commit.

## Assets and Media

- Verify that `assets/extension-icon.png` remains a 512 × 512 PNG and is readable in light and dark themes.
- Keep the original `claude.png` and `codex.png` provider logos because the list and usage viewer reference them, and regenerate `providers-menu-bar.png` from those originals if either provider asset changes.
- Do not add the native files from a contributor commit. A Raycast team member adds both macOS architectures under `assets/node-pty` after independently verifying their provenance.
- Capture three to six sanitized Store screenshots at 2000 × 1250 pixels and place them in `metadata` before submission.
- Never include usernames, private prompts, personal filesystem paths, tokens, account details, or private project names in Store media.

## Manual Product Verification

- Test with only Claude Code installed, only Codex CLI installed, and both installed.
- Test a new chat and a resumed chat through the startup form with the safeguarded default permission profiles.
- Verify Codex personality, verbosity, reasoning summary, Fast/flex tier, model, and effort in the generated command.
- Verify Claude model, effort, Fast mode, output style, transcript view, and permission mode in the generated command.
- Confirm that YOLO and bypass profiles always require the destructive confirmation dialog.
- Send plain text, accented text, slash commands, clipboard images, and selector key presses.
- Verify full terminal history, live streaming, scrolling, prompt history, zoom, `⌘⇧Esc`, and session termination.
- Customize one shortcut, disable another, verify both terminal views update, then restore all defaults.
- Verify favorites, aliases, deduplication, complete history, MCP servers, skills, usage refresh, and menu-bar modes.
- Verify shared `tmux` sessions from Raycast and a second terminal without starting two writers.
- Test Terminal, Warp, Zed, Visual Studio Code, Cursor, and Windsurf when each application is installed.
- In Zed, confirm that the existing window switches to the selected project without merging it into the current worktree and that the CLI opens in a Terminal Thread.
- Test once without Accessibility permission and confirm that the copied-command fallback is understandable.
- After the Raycast-owned binary commit is present, test both Apple Silicon and Intel builds.

## Privacy and Security Review

- Confirm that conversation discovery, aliases, favorites, transcripts, and usage caches remain local.
- Confirm that MCP environment variables, headers, and tokens are never rendered in full.
- Confirm that logs, screenshots, fixtures, and documentation contain no personal data or credentials.
- Confirm that the manifest and interface contain no obsolete language preference or non-English fallback copy.
- Review every dependency update and preserve the declared `node-pty` provenance in the lockfile and README.
- Record any advisory inherited from the current Raycast SDK in the pull-request notes instead of forcing a breaking downgrade.

## Store Submission

1. Review `git status`, add only intended extension files, and commit them without logs, local caches, credentials, or private media.
2. Keep `{PR_MERGE_DATE}` in `CHANGELOG.md`; the Raycast merge workflow replaces it automatically.
3. Sign in to GitHub and the Raycast developer account used by the `author` field.
4. Run `npm run publish`.
5. Review the generated pull request, automated checks, media, and reviewer instructions.
6. Respond to Store review feedback with focused commits and rerun the complete checklist.

## Official References

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Zed CLI Reference](https://zed.dev/docs/reference/cli)
- [Codex Configuration Reference](https://developers.openai.com/codex/config-reference)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-usage)
