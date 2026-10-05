# Extension naming and final defaults

Status: resolved
Type: grilling
Blocked by: —

## Question

With both surfaces decided (**Raycast UI layout**, **Menu-bar surface**) and picks/quota parity locked (**Picks and quota parity**), settle the last spec defaults before the build:

1. **Name, description, icon**: the prototypes already title everything "OpenCode Go" and the menu-bar pill uses the opencode logo as the icon. Lock the extension's display name, one-line description (for the manifest and Store metadata later), and confirm the icon = the opencode logo as both the command icon and menu-bar template image.
2. **Catalog fold default**: the reference folds catalog rows past `maxModels` into "other (N)" with default 12. Mac default — mirror 12, or pick a Mac-friendly number (prototypes mock 5)?
3. **Pricing cache TTL**: how stale cached models.dev pricing may get before a refetch (models.dev is slow-moving/cacheable). Recommend a TTL and confirm the full view's refresh-on-open rule (e.g. refresh on open only when the cached payload is older than the menu-bar interval of 60s).

Record the decision; this is the last thing to decide before the map hands off to a build-spec assembly.

## Answer

Decision (grilled with human, recommendations accepted):

1. **Name, description, icon**: display name **"opencode usage"**; description **"opencode usage — limit windows, model catalog, and daily picks."**; icon = the **opencode logo** — color version as the extension/command icon, monochrome template variant as the menu-bar pill image. The name is opencode-branded, not OpenCode-Go-branded: the extension is meant to later cover more opencode features under one identity, so "Go" appears only where it names the product (the **Go limits** section, the **Go key** preference), never in the title or description.
2. **Catalog fold default**: a `maxModels` preference **defaulting to 12**, mirroring the reference (both surfaces reuse the fold).
3. **Pricing cache TTL + refresh-on-open**: **pricing TTL 24h**, cached separately from usage (aligned with the daily picks recompute); **usage refreshes at the surface cadence** (menu bar 60s + on-click, full view on-open); the full view refreshes on open **only when the cached payload is older than 60s**, and never refetches pricing while its 24h TTL is warm.

With this, **every decision is settled** — the map's destination is reached and it hands off to assembling the build spec.