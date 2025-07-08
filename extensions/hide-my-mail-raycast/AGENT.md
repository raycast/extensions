# Implementation Plan: "Hide-My-Mail-Cloudflare" Raycast Extension

## 1. Objective
Convert the existing **Hide-My-Mail-Cloudflare** browser extension into a fully-featured Raycast extension that allows users to create, list, edit, and delete Cloudflare email aliases directly from Raycast.  The extension will use **Context7 MCP Server** (https://context7.com/raycast/extensions) as example

## 2. Guiding References
1. **Project Analyses in `DOCS.md`** – architectural breakdowns of both *duan-raycast-extension* and *hide-my-mail-cloudflare*.
2. **Hide-My-Mail DeepWiki** – additional Cloudflare alias logic & API details.
3. **Duan Raycast Extension DeepWiki** – Raycast-specific best practices & utilities.

## 3. High-Level Feature Parity Matrix
| Feature | Browser Extension | Required in Raycast | Notes |
|---------|------------------|---------------------|-------|
| Create random alias | ✅ | ✅ | Form command + action
| Label & description | ✅ | ✅ | Editable via form
| List aliases | ✅ | ✅ | List command with actions
| Delete alias | ✅ | ✅ | List action
| Copy alias | ✅ | ✅ | List action (clipboard)
| Destination email setting | ✅ | ✅ | Stored as Raycast preference
| Zone/API key settings | ✅ | ✅ | Stored as Raycast preference


## 4. Architectural Blueprint
```
raycast-extension/
└─ hide-my-mail-raycast/
   ├─ package.json (Raycast manifest)
   ├─ src/
   │  ├─ commands/
   │  │  ├─ list-aliases.tsx
   │  │  └─ create-alias.tsx
   │  ├─ components/
   │  │  ├─ AliasItem.tsx
   │  │  └─ AliasDetail.tsx
   │  ├─ hooks/
   │  │  └─ useAliases.ts
   │  ├─ services/
   │  │  ├─ api/
   │  │  │  ├─ client.ts
   │  │  │  └─ endpoints.ts
   │  │  └─ cf/
   │  │     └─ rules.ts
   │  ├─ types/
   │  └─ utils/
   └─ README.md
```
*Pattern lifted from `duan-raycast-extension` for familiarity and code reuse.*

### 4.2 Raycast UI & API Best Practices (Context7 Highlights)
Leverage proven patterns from `/raycast/extensions` documentation to ensure a native Raycast feel:

- **Dynamic Lists with Detail Panels** – Use `List`'s `isShowingDetail` prop (doc snippet #_snippet_7) to show rich alias metadata (label, created date, description) on the right pane. Allow users to toggle detail visibility via an `Action`.
- **Structured Metadata** – For an alias detail view, apply `List.Item.Detail.Metadata` (snippet #_snippet_23) to present key–value data like forward destination, rule ID, and timestamp.
- **Clipboard Actions** – Employ `Action.CopyToClipboard` (snippet #_snippet_3) for quick copying of alias addresses, rule IDs, or API paths.
- **Confirmation & Destructive Actions** – Style delete operations with `Action.Style.Destructive` (snippet #_snippet_23) and include `Alert` confirmation.
- **UseCachedPromise for SWR** – Wrap Cloudflare fetches with `useCachedPromise` (utils doc) to avoid flicker and support pull-to-refresh (`⌘ R`).
- **Form Drafts & Validation** – Enable `enableDrafts` (form snippet #_snippet_2) so partially-filled create/edit forms aren't lost when users switch contexts. Continue using custom validation but surface errors via `Toast.Style.Failure`.
- **Keyboard Shortcuts** – Adopt common shortcuts (Keyboard.Shortcut.Common) e.g. `⌘ ⇧ R` to refresh list, `⌘ ⌥ C` to copy.
- **Menu Bar Extra (Optional)** – Consider a lightweight Menu Bar command using `MenuBarExtra` (snippet #_snippet_3) to quickly create an alias outside of full Raycast window.

Integrating these UI idioms ensures the extension behaves consistently with other high-quality Raycast extensions.

### 4.3 DeepWiki-Derived Implementation Notes
Drawing from the in-depth docs of both upstream repositories:

1. **Cloudflare Rule Naming Convention** – Follow `[hide_mail]|<timestamp>|<label>|<description>` exactly (see Hide-My-Mail wiki).  This allows round-tripping between Raycast and the existing browser extension without clashes.
2. **Pre-allocated "Unused" Rules** – Mimic the Chrome extension's pool approach: during first-run setup create up to **180** forwarding rules flagged with `label="unused"`, enabling near-instant alias generation later.  Expose a preference toggle (`preAllocatePool`) so users on the free Cloudflare tier can opt out.
3. **Storage / React Patterns** – Re-use the `BaseStorage + useStorage` reactive wrapper from *duan-raycast-extension* for any client-side cache (e.g. recently used labels).  While core credentials live in Raycast **Preferences**, ephemeral UI state can lean on this hook for Suspense-compatible rendering.
4. **Validation Utilities** – Import the shared `services/validation` helpers from *duan* as a local module to keep form checks consistent (max 64-char label, disallow `|` char, etc.).
5. **Error Codes Mapping** – Surface the exact Cloudflare error codes catalogued in the Hide-My-Mail docs (`auth_error`, `not_enabled`, etc.) via Raycast `Toast` messages for parity.

## 5. Detailed Module Plan
### 5.1 Preferences (`package.json > preferences`)
| Name | Type | Description |
|------|------|-------------|
| `cloudflareApiKey` | password | Cloudflare API Token |
| `cloudflareZoneId` | text | Zone ID where routing rules exist |
| `destinationEmail` | text | Real inbox to forward mails |


### 5.2 Types (`src/types`)
* `AliasRule` – mirrors Cloudflare Email Routing rule (id, name, matchers, actions, enabled).
* `ParsedAliasMeta` – `{ timestamp: number; label: string; description: string; email: string; }`.

### 5.3 API Layer
1. **`client.ts`**
   * Retrieves API key & Zone ID from preferences.
   * Adds `Authorization: Bearer` header.
   * Thin wrapper over `fetch` with error handling & MCP logging.
2. **`endpoints.ts`** – base URLs + helper builders.
3. **`rules.ts`**
   * `listRules()`: GET all routing rules.
   * `createRule()`: POST new forwarding rule skeleton **using the naming template** `[hide_mail]|${Date.now()}|unused|unused` when pre-allocating.
   * `updateRule(id, { label, description })`: PUT – replace the two `unused` placeholders.
   * `deleteRule(id)`: DELETE + optionally `createRule()` to replenish the pool when `preAllocatePool` is on.
   * **Parser helpers**:
     ```ts
     export function parseRuleName(raw: string): ParsedAliasMeta {
       const [_prefix, ts, label, desc] = raw.split("|");
       return {
         timestamp: Number(ts),
         label: label === "unused" ? undefined : label,
         description: desc === "unused" ? undefined : desc,
       };
     }
     ```
   * **Pool utilities**: `getUnusedRules()`, `ensurePoolSize(min = 20)`.

### 5.4 Hooks & Caching
* `useAliases` – wraps `useCachedPromise` (from `@raycast/utils`) to fetch aliases with SWR pattern.
* Cache key incorporates Zone ID, API key hash, **and** `preAllocatePool` flag so toggling it invalidates old data.

### 5.5 Commands
1. **List Aliases (`list-aliases.tsx`)**
   * Show `List` with search filter.
   * `isShowingDetail` reveals rich metadata (see §4.2).
   * Each `AliasItem` exposes actions:
     * Copy address to clipboard.
     * Toggle detail pane.
     * Edit (push to `create-alias` with existing data).
     * Delete (with confirmation) – replenishes pool when enabled.
2. **Create / Edit Alias (`create-alias.tsx`)**
   * `Form` with fields: Label, Description.
   * "Use Random Unused" button picks the first entry from `getUnusedRules()` (generates new one if pool empty).
   * On submit: call `updateRule` then `popToRoot()` & trigger `useAliases.revalidate()`.

### 5.6 UI Components
* `AliasItem.tsx` – compact row with accessories for label / created time.
* `AliasDetail.tsx` – full rule JSON, quick copy buttons, open-in-browser action.

### 5.7 Validation Layer
* Re-use validation helpers from `duan-raycast-extension/services/validation` with added rule: forbid `|` character in labels/descriptions.

## 6. Error Handling & Notifications
* Map Cloudflare errors (`auth_error`, `not_verified`, etc.) to human-readable toasts.


## 7. Testing Strategy
* **Unit** – mock `fetch` for `rules.ts`, ensuring naming parser edge-cases.
* **Integration** – test hooks with MSW to stub Cloudflare endpoints.
* **Manual QA** inside Raycast across light/dark themes + menu bar extra.

## 8. Release Workflow
1. **Local build:** `ray build` via Raycast CLI.
2. **Versioning:** Conventional commits + `changesets` (monorepo friendly).
3. **Publish:** Submit to Raycast Store, include icon from `assets/`.

## 9. Future Enhancements
* Batch delete aliases.
* Custom domain alias support.
* i18n via existing monorepo `i18n` package.
* Dark-mode optimized icons.

---
*Prepared using analyses from `DOCS.md` and DeepWiki references alongside Context7 MCP documentation.*