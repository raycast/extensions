# AI Usage Monitor (Raycast extension)

A Raycast extension that shows, at a glance, how much of your Claude Code and
Codex subscription allowance is left and when it resets. Primary job: **live
quota monitoring** (don't hit the wall), with consumption/cost as secondary.

## Language

### The monitored tools

**Claude Code** (CC):
Anthropic's coding CLI, used on a Pro/Max subscription. One of the two tools this
extension monitors.

**Codex**:
OpenAI's Codex CLI (`github.com/openai/codex`), used on a ChatGPT subscription.
The other monitored tool. _Avoid_: "the Codex model" (this is the CLI, not the
2021 model).

### The two Raycast surfaces (easy to confuse — keep distinct)

**Menu-bar command** (系统菜单栏命令):
A `MenuBarExtra` living permanently in the **macOS system menu bar** (top-right of
the screen, by the clock). Always visible without opening Raycast; click for a
dropdown. Best for the glanceable quota monitor. _Avoid_: the bare word "菜单栏"
for anything else — it collides with the left-hand list of a view.

**View command** (详情视图命令):
A `List` / `Detail` page that opens **inside the Raycast window** when you run the
command. This is what the reference "Claude Code Usage" screen is (left list of
Today/This Week/Sessions/Costs/Models, right detail panel). Best for browsing
usage/cost detail. _Avoid_: calling this "the menu bar."

### The two data domains (keep these separate)

**Usage** (a.k.a. consumption):
How much you have *spent* — token counts and/or dollar cost — computed from local
session logs. Available offline for both tools. _Avoid_: conflating with Quota.

**Quota state**:
How much of your plan's allowance is *left* and *when it refills* — i.e. Remaining
+ Reset for a Window. This is the primary thing the extension shows. Not derivable
from usage logs alone (see per-tool sourcing).

**Window**:
A rolling period the subscription meters you against. Both tools have two:
- **5-hour window** — the short rolling limit (CC `five_hour`; Codex `primary`,
  `window_minutes: 300`).
- **Weekly window** — the 7-day limit (CC `seven_day`, plus per-model
  `seven_day_opus` / `seven_day_sonnet`; Codex `secondary`, `window_minutes: 10080`).

**Remaining**:
The share of a Window's allowance not yet consumed, as a **percent** (`100 −
utilization` / `100 − used_percent`). Both sources report a percentage, not an
absolute token count.

**Reset**:
The timestamp when a Window's usage returns to zero (CC `resets_at`; Codex
`resets_at`). The user's "刷新" maps here. _Avoid_: "refresh" for this — reserve
**refresh** for the *extension* re-polling its own data (a different thing).

### Per-tool sourcing of Quota state (they differ sharply)

**Codex quota** — two paths. (a) *Offline snapshot*: read the newest
`~/.codex/sessions/**/rollout-*.jsonl`, take the last `token_count` event's
`rate_limits` block (`primary` 5h, `secondary` weekly, `plan_type`). Free, no auth,
but it's a **snapshot from your last Codex use**, so it can be stale. (b) *Live*:
read the OAuth token from `~/.codex/auth.json` and call the undocumented
`https://chatgpt.com/backend-api/wham/usage` (as the `pi-codex-status` tool does).

**Claude quota** — no local file has it. Obtained the way the reference `ccusage`
extension does: read Claude Code's OAuth token (`~/.claude/.credentials.json` or
macOS Keychain `Claude Code-credentials`) and call the **undocumented**
`GET https://api.anthropic.com/api/oauth/usage`. Live, but rate-limited,
gray-area, and could break. _Avoid_: assuming symmetry with Codex.
