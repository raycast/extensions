# Hack Club CDN Raycast Extension — Design

Status: Approved. Reviewed by three independent experts (Raycast platform/Store conventions,
API integration & security, product/UX); all major findings resolved with the product owner
(see "Decisions" below). Ready for implementation planning.

## Goals

- Fast clipboard-to-CDN-link workflow: copy a file (or its path, or a URL) → run a command →
  the CDN link is on your clipboard.
- Also support a deliberate flow: pick a file from disk, or paste a path into a form.
- Browse/manage files uploaded through this extension, including deleting a mistaken upload.
- Publish on the Raycast Store, openly, clearly labeled as requiring a Hack Club account.

## Non-goals for v1

- Windows support (macOS only — the best input mechanisms, like Finder-selection and
  file-clipboard detection, are macOS-specific).
- Multi-file / batch upload (single file per invocation only).
- In-extension OAuth or account creation (users bring their own API token from
  `cdn.hackclub.com/api_keys`).
- Reconciling local upload history against the server (no listing API exists to reconcile
  against — see `docs/hackclub-cdn-api.md` §4).
- A menu-bar command (considered and explicitly deferred).

## Commands

### 1. `Upload Clipboard File` (no-view) — primary/most-used command

Reads the current clipboard and, in priority order, resolves it to something uploadable:

1. **An actual file reference** (e.g. a Finder ⌘C copy) → direct multipart upload,
   **no confirmation** — this is an explicit, deliberate user action, and speed is the point.
2. **Clipboard text that resolves to an existing absolute local file path** → show a native
   `confirmAlert()` ("Upload `<filename>`?") before uploading. Ambiguous text-derived matches
   are a real risk (a user may have copied a path for an unrelated reason — an SSH key, a
   password-manager export, a log excerpt) and this is a one-keypress guard against silently
   publishing something sensitive to a permanent public URL.
3. **Clipboard text that is an http(s) URL whose hostname is not `cdn.hackclub.com`**
   (compare via `new URL(text).hostname`, not string prefix/`includes`, to avoid subdomain
   spoofing) → show a native `confirmAlert()` ("Upload this link?") before calling
   `upload_from_url`. Same rationale as (2) — a copied URL may carry embedded credentials
   (signed S3/Slack/Google URLs) that would become fetched and permanently public.

If nothing matches, or the user declines the confirm dialog: show a failure
`Toast`/`showHUD` and exit — no retry.

If no API token is configured (see Preferences below): show a `showHUD`/failure `Toast`
with an action to open extension preferences, instead of attempting the request. This is a
required first-run state, not an edge case to skip.

On success: copy the returned `url` to the clipboard, append a record to local history
(newest-first), `closeMainWindow()` + `showHUD("Copied CDN link! Undo anytime in Recent
Uploads")`. No inline undo action here (HUD supports none) — this was an explicit,
approved tradeoff, mitigated by:
- explicit HUD copy pointing at the undo path,
- the just-uploaded item always appearing at the top of `Recent Uploads` (newest-first).

**Discoverability as the "default" command:** manifest ordering, keywords, and README copy
do **not** meaningfully influence Raycast's own root-search ranking (it's frecency-based,
per-user usage), so treat those as cosmetic, not load-bearing. What actually matters:
- Give this command and `Upload File` **clearly distinct titles/subtitles/keywords** so they
  don't read as interchangeable siblings in a fuzzy-matched list (e.g. lean into "paste/
  clipboard" language here vs. "browse/form" language on the other one).
- README explicitly recommends the user bind this command to a global hotkey — the real
  mechanism for "fast default," not manifest position.
- It will naturally become the most-used command through Raycast's own frecency ranking once
  used a few times, matching the stated expectation that it'll dominate real usage.

### 2. `Upload File` (view) — deliberate flow

`Form` with `Form.FilePicker` (browse disk) and a `Form.TextField` (paste/type a path).
Submit uploads via multipart. Shows an `Animated` → `Success`/`Failure` `Toast`, copies the
link to clipboard on success. The success `Toast` has:

```
primaryAction: {
  title: "Undo (Delete from CDN)",
  onAction: async (toast) => {
    await cdnClient.deleteUpload(id)
    // remove from local history
    toast.style = Toast.Style.Success
    toast.title = "Upload undone"
  }
}
```

No auto-dismiss timeout — Raycast's Success/Failure toasts don't appear to auto-hide on
their own, and this is already the slower/deliberate flow, so there's no urgency to add one.

### 3. `Recent Uploads` (view, List)

Shows local upload history only, newest-first, capped at ~200 entries (oldest dropped) —
there is no server-side listing API, so this can only ever reflect uploads made through this
extension. Label this explicitly in the view (e.g. an accessory note or `List.EmptyView`
copy: "Shows uploads made from this Mac") so it doesn't read as a complete account history.

Actions per item:
- **Copy Link** (primary)
- **Open in Browser**
- **Delete from CDN** — calls `DELETE /api/v4/upload/:id`, then removes the local record.
  Treat a `404` response as success (the upload is already gone either way — no need to
  distinguish "already deleted" from "deleted just now").
- **Remove from history** — local-only, no API call.

Both delete-like actions (this one and the Form's Undo) must re-read/re-write through the
same `LocalStorage`-backed history module, not independent in-memory state, so there's no
divergence between the two surfaces.

## Shared modules

- **`cdnClient.ts`** — thin wrapper around `fetch`:
  - `uploadFile(path: string)` — multipart via `fs.createReadStream`, field `file`.
  - `uploadFromUrl(url: string)` — JSON body `{url}`.
  - `deleteUpload(id: string)` — `DELETE /api/v4/upload/:id`.
  - All requests send `Authorization: Bearer <token>` from preferences.
  - Error handling: map status codes explicitly — `401` → "Invalid or missing API token"
    (with a preferences-opening action), `402` → surface the actual `quota` object
    (`storage_used`/`storage_limit`/`quota_tier`) in the message rather than a generic
    failure, `400`/`404`/`422`/`500` → surface the API's `error` message.
  - Never pass raw request/response objects (which may include the `Authorization` header)
    to `console.error`, `Toast.message`, or any other surface — extract only the fields
    needed for the user-facing message.
  - A lightweight pre-upload check (`fs.stat` for size, compared against the cached
    `quota_tier` limit) before attempting a large multipart upload, so oversized files fail
    fast instead of uploading megabytes just to get rejected. Not required for correctness
    (the API itself rejects oversized files) but meaningfully better UX for large files in
    the no-view flow.

- **`clipboardResolver.ts`** — shared detection logic (file / local-path-text / URL-text)
  used by `Upload Clipboard File`, so the sniffing rules live in one place.

- **`uploadHistory.ts`** — `LocalStorage` key `uploads`, JSON array of:
  ```ts
  { id: string, filename: string, url: string, size: number, contentType: string,
    createdAt: string, sourceType: 'file' | 'url' }
  ```
  capped at ~200 entries, newest-first. Both delete surfaces and the append-on-upload path
  go through this module.

## Preferences

- `apiToken` — extension-level, `type: "password"`, required. `description` links to
  `cdn.hackclub.com/api_keys` and notes the "Sign in with Hack Club" prerequisite, since
  there's no in-extension OAuth flow.

## Store listing / positioning

- Publish openly on the Raycast Store.
- Extension description states plainly that it requires a Hack Club account (the CDN itself
  is gated behind Hack Club's own OAuth identity system — not a general-purpose public CDN).
- In addition to the Store-listing disclosure, the `401`-handling described above gives
  in-product messaging the moment someone without a valid token tries to use it, rather than
  relying solely on them having read the Store description first.

## Decisions from expert review (resolved)

| Finding | Resolution |
|---|---|
| Silent upload of clipboard-resolved file paths / URLs risked accidental exfiltration of sensitive content to a public URL | Added `confirmAlert()` before uploading for the two text-resolved cases; actual Finder file-copies remain instant |
| `upload_from_url` loop guard used string prefix matching | Use `new URL(text).hostname === 'cdn.hackclub.com'` |
| No "missing token" state designed for the no-view command | Explicit first-run state added: failure HUD/Toast + action to open preferences |
| Multi-file upload not addressed | Explicitly out of scope for v1 (single file only), deferred to a future version |
| Manifest order/keywords assumed to create a "default" command | Corrected: Raycast ranks by frecency; real discoverability levers are distinct naming and a suggested hotkey, not manifest position |
| `Recent Uploads` could be mistaken for full account history | Explicit "uploads made from this Mac" labeling in the view |
| 402 quota errors would show a generic failure message | `cdnClient` parses and surfaces the `quota` object specifically |
| Double-delete between Form-Undo and Recent-Uploads-Delete | Both go through the same storage module; 404-on-delete treated as success |
| Undo-discoverability (HUD + Recent Uploads only) questioned by two reviewers | Kept as designed per product owner — HUD copy made explicit, newest-first ordering relied on, no new UI surface added |

## Publishing checklist (for later)

Icon (512×512, light/dark variants), README (setup instructions, Hack Club account
requirement, hotkey recommendation), CHANGELOG, 3–6 Store screenshots, `ray lint` / `ray
build` clean, submit via `npm run publish`.
