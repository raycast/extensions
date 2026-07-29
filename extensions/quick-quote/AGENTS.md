# AGENTS.md

Project-level guidance for AI agents working in this repository.

## Commands

```bash
npm run dev        # start Raycast extension in development/hot-reload mode
npm run build      # production build via `ray build`
npm run lint       # ESLint via `ray lint`
npm run fix-lint   # auto-fix lint issues
npm test           # pure-logic unit tests (vitest)
npm run publish    # submit to Raycast Store
```

Unit tests cover pure quote/selection logic only. Host integration (AX, AppleScript, paste) is validated by running `npm run dev` and triggering the command inside Raycast.

**Use npm, not pnpm.** The Raycast store publish validates `package-lock.json` (`raycast/extensions` monorepo runs on npm), and `ray publish` fails without it.

## Architecture

Single-command Raycast extension (`mode: "no-view"`). Command glue lives in `src/quick-quote.ts`; pure quote/selection helpers live in `src/quote.ts` (unit-tested).

**Command flow:**

1. Save the current clipboard (full `Clipboard.read()` content: text, HTML, or file) before touching anything.
2. Attempt to read selected text via the macOS Accessibility API (`getSelectedText`). This is the preferred path but fails silently in apps (like terminals) that don't expose AX text selection.
3. If AX fails or returns empty, fall back to `Cmd+C` via AppleScript. Read the NSPasteboard `changeCount` (via JXA `osascript`) before and after the keystroke: only a bump proves the keystroke actually copied a selection, which distinguishes a real selection from a stale clipboard that must never be quoted. Terminals that auto-copy on select still work because they re-copy on `Cmd+C`. If the fallback overwrote the clipboard but the selection is empty or whitespace-only, restore the original clipboard before bailing.
4. Transform the selection: normalize CRLF/CR to LF, strip trailing newlines, prefix every line with `> `, append a single trailing newline.
5. `Clipboard.paste()` the quoted text directly into the focused app.
6. Restore the original clipboard after a short delay so the user's prior clipboard content survives (restoring file and HTML content, not just text). Restoration runs in a `finally`, so a failed paste still restores. Show a brief HUD on success.

**Why the timing delays exist:** `COPY_DELAY_MS` (150ms) gives the `Cmd+C` keystroke time to reach the target app and update the clipboard before we read it. `PASTE_DELAY_MS` (200ms) gives `Clipboard.paste()` time to complete before we overwrite the clipboard with the restore.

**Key constraint:** Because this is a no-view command, there is no React component or UI layer. `showHUD` is the only user-visible feedback mechanism.
