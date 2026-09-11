# p00f Changelog

## [Fix Web Crypto crash on every create] - 2026-07-27

- Fixed every command failing with `ReferenceError: crypto is not defined`. p00f encrypts on your device using the Web Crypto API, and Raycast's extension host runs commands in a scope with no `crypto` global, so encryption threw before any Poof could be created. The extension now installs Node's Web Crypto implementation itself. No Poof content was ever at risk: the failure happened before anything left the machine.

## [Initial Version] - 2026-07-27

- **Create Poof**: full form for text or one file with TTL, Reveal budget, PIN, secret kind, masked URL, reveal-anchored TTL, viewer-delete, reveal captcha, and countdown options.
- **Poof Selection**: quick command for selected text or one Finder-selected file.
- **Poof Clipboard**: quick command for one clipboard file, plain text, HTML as text fallback, or a clipboard image (such as a `Cmd+Shift+Ctrl+4` screenshot).
- All Links and owner tokens copied with Raycast's concealed clipboard option.
- Optional paste-after-create preference.
- Result screen with copy link, paste link, copy owner token, burn now, and open in browser actions. Burning switches the screen to a burned state so the dead link is never presented as live.
- Anonymous machine-path client with no client-identifying headers. The hosted p00f service receives only ciphertext.
