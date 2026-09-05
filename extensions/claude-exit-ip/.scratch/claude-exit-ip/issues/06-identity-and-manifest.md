# 06 — Extension identity and manifest

Parent: [map.md](../map.md)
Type: grilling
Status: resolved
Blocked by: 03

## Question

Given what [03](03-store-rules-and-manifest.md) found, what is this extension called and what does its manifest say?

Decide:

- Extension `name` (slug), `title`, `description`, and the single command's `name`/`title`/`subtitle`/`description`.
- Icon: what it depicts, given the trademark findings. The reference card uses Anthropic's asterisk mark.
- `categories`, `license`, `author` handle.
- Whether any `preferences` exist at all in v1. Default: none.
- Node/`@raycast/api` versions to pin, taken from what ipcheck-ing currently ships.

## Answer

**Name: `claude-exit-ip`. Title: `Claude Exit IP`.**

The single-command rule from 03 forbade a bare `"Claude"`, so the title is brand + function noun in the `China IP Address` / `GitHub Status` mould. "Exit IP" over "IP Address" deliberately: the per-destination framing is the only thing distinguishing this from `ipcheck-ing`, `myip`, `ip-geolocation`, and `china-ip-address`, all of which already answer "what is my IP". At submission time the duplicate-value check turns on exactly that word.

### The manifest

```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "claude-exit-ip",
  "title": "Claude Exit IP",
  "description": "Show the exit IP address and location claude.ai sees you connecting from",
  "icon": "extension-icon.png",
  "author": "marcuslannister",
  "categories": ["Developer Tools", "Web"],
  "platforms": ["macOS"],
  "license": "MIT",
  "keywords": ["claude", "anthropic", "ip", "exit ip", "geolocation"],
  "commands": [
    {
      "name": "index",
      "title": "Show Exit IP",
      "description": "Show the exit IP address and location claude.ai sees you connecting from",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.23",
    "@raycast/utils": "^2.2.7"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "^26.1.1",
    "@types/react": "19.2.17",
    "eslint": "^10.7.0",
    "prettier": "^3.9.6",
    "typescript": "^6.0.0"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

### Why each contested field is what it is

**Command title `Show Exit IP`, not `Show Claude Exit IP`.** The brand lives in the extension title; repeating it stacks it twice in one root-search row (`Show Claude Exit IP` over `Claude Exit IP`). This follows the two closest status-shaped analogues — `GitHub Status` → "Summary", `Slack Status` → "Set Status" — over the structurally-nearest `China IP Address` → "Lookup China IP Address". Discovery is unaffected: root search matches the extension title too, so typing "claude" still finds it.

**`"name": "index"` → `src/index.tsx`.** The corpus default for single-command extensions at 534 uses; `search` is a distant second at 30.

**No `subtitle`.** 03's rule for single-command extensions, taken at face value. `ipcheck-ing` keeps one (`"subtitle": "IPCheck"`) and gets away with it, but it adds nothing here that the extension title doesn't already say.

**Description, 72 chars, no disclaimer.** Above the 54-char corpus median, well inside p90 (114). Names both halves of what 05 specified — the IP *and* the location — and "connecting from" carries the per-destination point. The `commands[0].description` mirrors it verbatim, as `china-ip-address` does; the 12-char minimum is not remotely in play.

"Unofficial:" prefixing was considered and rejected. It is accepted practice (16+ extensions), and pairing it with a verbatim vendor mark would have bought explicit distance from the *impersonation* rejection reason — the one brand-adjacent rule 03 found. It lost because `extensions/claude` ships the bare trademark *and* Anthropic's unmodified wordmark with no disclaimer at all, and because it opens the Store blurb on a caveat instead of the value. Revisit only if review pushes back.

**Icon: Anthropic's sunburst glyph, verbatim, cream on clay.** What `claude-sessions` and `claude-code-launcher` ship. 03 established there is no Raycast trademark or logo policy, so all three shapes — verbatim mark, derivative, own lettermark — pass review; this was a legal-comfort call, not a compliance one. Chosen for recognisability at 22px and for matching the reference card. A derivative (sunburst + location motif, per `claudecast`'s rotated-diamond precedent) was the runner-up; it would distinguish this from the four sibling Claude extensions but muddies at root-search size.

**One asset, no `@dark` twin.** The mark sits on a solid clay background, so it reads on both themes. `extensions/claude` needs a twin only because its wordmark is black on transparent.

**`categories: ["Developer Tools", "Web"]`** — what `ip-geolocation`, the nearest published peer, ships. Two browse surfaces. `ipcheck-ing` uses `Developer Tools` alone; `Web` was added for the network-diagnostics browse.

**`platforms: ["macOS"]`** — matches both Claude-branded peers. Nothing in 04 or 05 is macOS-specific (it is `fetch` plus React), and `myip` / `ip-geolocation` / `ip-tools` all declare Windows too — but declaring a platform this machine cannot exercise would put an unverifiable claim in the manifest, against the evidence standard 11 is setting. Widening later is a non-breaking manifest edit.

**`preferences`: none. The key is absent entirely.** Every candidate is already disposed of — geo provider by 05 ("a question the user has no basis to answer"), fallback host by 04 — and refresh/cache belongs to 08, which can still add one, since the manifest is not written until 10. `ipcheck-ing` ships seven checkboxes because it has seven IP sources to toggle; this has one source and one provider.

### Dependencies — the ticket's own premise, overridden

The ticket said to take versions from what `ipcheck-ing` currently ships. That would pin `@raycast/api` `^1.87.5` and `@raycast/utils` `^1.17.0` — the latter two majors stale. Taking 03's measured corpus tip instead: `^1.104.23` and `^2.2.7`, with devDependencies at the modal values among the 28 extensions already on that API version.

`@raycast/utils` is included on the judgment that it is load-bearing rather than speculative: 05's progressive render (IP paints at ~0.4s, geo fills after) maps onto `usePromise`, and 08's caching question maps onto `useCachedPromise`. If 07 and 08 both land on plain `useState`, 10 drops it.

**No `node-fetch`.** 04 and 05 both specify bare global `fetch` with `AbortSignal.timeout`; the sibling's `node-fetch` dependency is not carried over. Verified as current idiom: 8 of a 40-extension sample on `@raycast/api ^1.10x` call global `fetch` with no `node-fetch` dependency.

**No `engines` field.** 2 of 60 extensions at the current API version declare one.

### Recorded, not decided

- **`marcuslannister` is unverified as a *Raycast* handle.** It is the GitHub handle, and Raycast handles are commonly the same, but 03 flagged that they can differ and that `author` must be the Raycast one. No extension of this author exists in the corpus to confirm from. A wrong value fails at publish time, not at build time — so this is a submission-time check (`raycast.com/marcuslannister`), and submission is out of scope. Stated here as an assumption the spec inherits.
- **Anthropic's own trademark policy was never read.** 03 established only that *Raycast* has no trademark or logo policy. The icon decision rests on peer precedent — `claude-sessions`, `claude-code-launcher`, `claudecast`, `perplexity`, and 548 brand-named icons corpus-wide, all shipping unchallenged — not on Anthropic's terms. Unexamined on purpose; it is a question about the vendor, not about the Store.
- **The icon asset does not exist yet, and must not be copied from a sibling.** "Sunburst on clay" fixes what it depicts, not where the pixels come from. Lifting `claude-sessions/assets/icon.png` would be copying another extension's asset file; the build session renders a 512×512 PNG from Anthropic's own brand SVG instead. Build input for 10, not a decision.

### Consequences for the rest of the map

- **Repo name: `claude-exit-ip`**, matching the slug. The working directory was `claude-connection`; renamed on resolution of this ticket.
- **`src/index.tsx`** is the single source file the build session creates — 07 and 09 render into it.
- The **bootstrap fog is now fully determined** and needs no ticket of its own: MIT `LICENSE` (03, schema enum, 3105/3105), npm with a committed `package-lock.json`, `.gitignore` from the `ray` template, README, and the `ray` CLI arriving via `npm install` as a transitive of `@raycast/api`. All of it is spec content that 10 writes out.
