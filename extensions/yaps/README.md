# Yaps Memory for Raycast

Search a local Yaps vault and save clipboard text as Markdown notes from Raycast.

This is a macOS-only companion to Yaps. It requires the Yaps desktop app or its `yaps_cli`
executable; it does not replace Yaps or create a vault for you.

## Commands

- **Search Yaps Memory:** shows recently updated notes before you type, then searches note titles
  and contents through the Yaps local index. View Markdown, copy a wikilink or the full note, open
  the Markdown file, or reveal it in Finder.
- **Save Clipboard to Yaps:** creates a Markdown note from the current clipboard text in `Inbox`
  (or the vault-relative folder selected in extension preferences). The note title is derived from
  the first non-empty clipboard line, or from the current date and time when no non-empty line is
  available.
- **Open Yaps:** launches the desktop app, with a download-page fallback when it is not installed.

## First-day setup

1. Install Yaps for macOS from [yaps.ai/download](https://yaps.ai/download), sign in, and choose a
   vault. An active free trial or Yaps Pro is required.
2. Install **Yaps Memory for Raycast** from the Raycast Store.
3. Run **Search Yaps Memory**. With an empty search field it shows recently updated notes; type to
   search note titles and contents.
4. Run **Save Clipboard to Yaps** when text is on your clipboard. It saves to `Inbox` by default.

No connection step or CLI path is required for a normal Yaps install. The optional
**Yaps CLI Path** preference is only for an intentional alternate placement of the official
packaged helper; it accepts `~` at the start of a path. **Clipboard Capture Folder** is prefilled
with `Inbox`; change it only when you want captures saved to a different folder relative to the
active Yaps vault.

## CLI discovery

The extension resolves and validates the CLI in this order:

1. **Yaps CLI Path**, when configured.
2. `yaps` or `yaps_cli` on Raycast's `PATH`.
3. The packaged `yaps_cli` inside the installed Yaps application returned by macOS.
4. The verified system and per-user Applications locations.

Every candidate must pass a bounded, read-only `status` check. An invalid configured override fails closed so Raycast never silently runs a different binary. The extension never invokes the Yaps GUI executable as a CLI.

Setapp CLI automation is deferred until a future Yaps helper can report its
separate settings and entitlement state correctly. The extension does not
guess that state or scan Setapp data directories.

Before each vault operation, the extension follows the desktop app's canonical settings file and
checks the credential-free account status available in Yaps 2.3.124 or newer. It deliberately does
not run the older credential-based check when the installed version is old or cannot be verified.
Vault commands proceed only for the signed-in desktop account when its free trial or Yaps Pro is
active. Account switching and access changes are picked up automatically; there is no separate
Raycast account or Connect button. If an otherwise signed-in account cache is temporarily
incomplete, Raycast can quietly wake and retry only the verified standard Yaps app at
`/Applications/Yaps.app` or `~/Applications/Yaps.app`. It never wakes an adjacent custom app or
Setapp for this recovery, and it does not retry signed-out, expired, or mobile-only accounts.

The **Open Yaps** command discovers the app through macOS application metadata and can open it
outside `/Applications`; if it cannot find the app, it opens the download page.

## Privacy and security

- The extension calls the locally configured CLI executable directly with an argument array; it
  never starts a shell and does not request an API key or account credential.
- Search and note reads happen through the local CLI and file-backed vault. The extension does not
  upload note content to a Raycast service; if you configure a third-party executable, that
  executable controls its own behavior.
- Clipboard capture writes a short-lived Markdown file under Raycast's extension support directory,
  with owner-only permissions, asks Yaps to import it, and removes the temporary file in a `finally`
  block.
- Returned note paths and their real filesystem targets are verified beneath the active vault root
  before the extension opens or reveals a file.

## Development

```bash
bun install
bun run test
bun run lint
bun run build
bun run dev
```

The tests use an executable fake CLI, rather than mocked response helpers, to cover argument
forwarding, Yaps response envelopes, malformed and unsupported responses, private temporary-file
permissions, missing notes, and vault path traversal (including symlinks).

The manifest is intentionally macOS-only for this release. Cross-platform CLI support is not
advertised or required by the current Store package.

## Before a public Store submission

- Confirm that `author` in `package.json` is the exact Raycast publisher username before publishing.
- Use the three checked-in Store screenshots in `metadata/` as the starting submission
  set. Raycast allows up to six; use 2000 × 1250 PNGs in a consistent 16:10 presentation, with one
  consistent background and no sensitive data or screenshots of other applications.
- Run every command against the current production Yaps build.
- Run `bun run lint:store` and `bun run build` locally. Linting is local; publisher authentication
  is required when you publish.
- Raycast's public Store guidance expects npm installation with a `package-lock.json`, which
  is included for Store tooling. The Yaps application repository also tracks `bun.lock` for local
  development. Keep both source lockfiles current; the Store repository omits Bun lockfiles.
- Review the latest [Raycast extension Store guidance](https://developers.raycast.com/basics/prepare-an-extension-for-store)
  and privacy/security guidance before publishing.
