# Mailto Link Generator

A Raycast extension that builds a `mailto:` link from a simple form with **every**
field — To, Cc, Bcc, Subject and Body — then copies it or opens a draft.

## Command

**Generate Mailto Link** — opens a form. As you type, a live preview of the
generated link (and its length) is shown at the bottom.

| Shortcut | Action |
| --- | --- |
| `↵` | Copy the raw `mailto:` link to the clipboard |
| `⌘` `⇧` `C` | Copy as an HTML anchor — `<a href="mailto:…">…</a>` |
| `⌘` `O` | Open a pre-filled draft in your default mail app |
| `⌘` `G` | Open a pre-filled compose window in **Gmail** (browser) |
| `⌘` `⇧` `O` | Open a pre-filled compose window in **Outlook** (browser) |
| `⌃` `X` | Reset the form |

All actions are also available via `⌘` `K`. **The form opens empty by default** —
pre-filling is entirely opt-in via the preferences below. Recipients in
**To / Cc / Bcc** can be separated by a comma, semicolon or new line. Addresses
are validated leniently — obvious mistakes are flagged inline (on blur), but
unusual-yet-valid addresses are not rejected.

## Preferences

All optional. Set them in Raycast Settings → Extensions → Mailto Link Generator
(or via the **Configure Defaults…** action). Out of the box they're all empty/off,
so the form stays empty.

| Preference | Effect |
| --- | --- |
| **Remember last-used values** | Off by default. When on, the form restores whatever you last entered. |
| **Default Cc / Bcc** | Pre-filled into a fresh form when set. |
| **Signature** | Appended to the body of a fresh form after a `-- ` delimiter. Single-line; use `\n` for line breaks. |
| **Outlook Account** | Whether **Open in Outlook** targets `outlook.office.com` (work/school) or `outlook.live.com` (personal). |

## How it handles the tricky bits

`mailto:` links look trivial but have several well-known encoding pitfalls
([RFC 6068](https://www.rfc-editor.org/rfc/rfc6068.html)). This extension takes
care of them:

- **Spaces are encoded as `%20`, never `+`.** A literal `+` is ambiguous with
  sub-addressing (`bill+ietf@example.org`) and some clients turn `+` back into a
  space. We use `encodeURIComponent`, which emits `%20` for spaces and `%2B`
  for real plus signs.
- **Body line breaks become `%0D%0A` (CRLF).** A textarea produces bare `\n`, so
  the body is normalised to `\r\n` before encoding, as the RFC requires.
- **Reserved characters (`?`, `&`, `%`, …) are percent-encoded** inside subject
  and body so they can't be mistaken for URI delimiters.
- **`@` is kept readable** in the address list (`a@b.com`, not `a%40b.com`).
- **HTML output escapes `&` to `&amp;`** in the `href`, and escapes the visible
  label, so the anchor is valid markup.
- **Length is shown live.** Very long links can be truncated by the OS mail
  handler — if a body is huge, prefer "Copy link" over "Open" so nothing is lost.
- **Empty recipient is allowed.** `mailto:?subject=…&body=…` is valid and useful
  for reusable templates; the form only blocks a completely empty link.

## Development

```bash
npm install
npm run dev      # hot-reload in Raycast (requires the Raycast app)
npm run build    # type-check + bundle
npm run lint     # eslint
```

> **Node version:** Raycast's tooling targets Node 22+. If `npm run dev` complains
> about your Node version, install Node 22 (e.g. `nvm install 22 && nvm use 22`).

To change the icon, edit `assets/icon.svg` and re-export `assets/command-icon.png`
at 512×512.
