# Skills Manager — Raycast Extension Plan

A Raycast extension that wraps the [xingkongliang/skills-manager](https://github.com/xingkongliang/skills-manager) CLI (`skills-manager-cli`). The extension contains **no business logic of its own**: every operation shells out to the CLI with `--json` and renders the result with native Raycast components. The CLI and the desktop app share one SQLite database and repository lock, so state seen in Raycast is always consistent with the app.

Reference for the CLI contract: `skills/manage-skills/SKILL.md` in the upstream repo — it documents every command, the JSON error shape, and the known pitfalls. Treat it as the interface spec.

---

## 1. Scope

**In scope (commands):**

| Raycast command | Mode | Underlying CLI |
|---|---|---|
| My Skills | `view` | `skills list`, `skills show`, `skills status`, `skills deploy/undeploy`, `skills update`, `skills tag *`, `skills remove` |
| Search Skills | `view` | `skills search`, `skills install`, `skills deploy` |
| Presets | `view` | `presets list/show/status/deploy/undeploy/create/delete/add-skill/remove-skill` |
| Agents | `view` | `agents list`, `agents enable/disable` |
| Check Updates | `view` | `skills check --all`, `skills update <id>` / `--all` |

**Explicitly out of scope:**

- Menu bar command — decided against.
- `git` command group (backup/sync/restore) — interactive and high-consequence; belongs to the desktop app.
- Legacy exclusive-sync workflow: `skills sync`, `presets apply/deactivate` — upstream says not to use these for normal on/off requests.
- Deprecated `skills enable/disable` — do not change deployment; never call them.
- `skills adopt` and `skills set-source` as standalone commands — offered only as recovery actions where they naturally arise (see §5.1 conflict handling). Full flows stay in the terminal/app.
- `--force` on `set-source` — never passed by the extension under any circumstances.

**Phasing:**

- **Phase 1:** CLI bridge + My Skills + Search Skills + Presets. Covers the daily 90%: inspect, search, install, deploy, toggle presets.
- **Phase 2:** Agents + Check Updates + polish (tag management UI, dry-run previews).

---

## 2. Tech stack & project shape

TypeScript, React, `@raycast/api`, `@raycast/utils` (`useExec`, `useCachedPromise`, `showFailureToast`). Standard `ray develop` / `ray build` toolchain, ESLint + Prettier configs from `@raycast/eslint-config`.

```
skills-manager/
├── package.json               # Raycast manifest (see §7)
├── tsconfig.json
├── assets/
│   └── icon.png               # 512×512 extension icon
├── src/
│   ├── my-skills.tsx          # command: My Skills
│   ├── search-skills.tsx      # command: Search Skills
│   ├── presets.tsx            # command: Presets
│   ├── agents.tsx             # command: Agents
│   ├── check-updates.tsx      # command: Check Updates
│   ├── components/
│   │   ├── SkillDetail.tsx        # metadata detail (shared by My Skills / Search)
│   │   ├── SkillActions.tsx       # shared ActionPanel sections for a library skill
│   │   ├── AgentPicker.tsx        # Form/submenu to choose target agent(s)
│   │   ├── DeployConflict.tsx     # TARGET_CONFLICT explanation + recovery actions
│   │   └── CliMissing.tsx         # guidance screens: not installed / BRIDGE_BROKEN
│   ├── lib/
│   │   ├── cli.ts             # resolveCli(), runCli() — the only place that spawns processes
│   │   ├── types.ts           # TS types for CLI JSON payloads
│   │   └── errors.ts          # CliError, error-code → user-message mapping
│   └── hooks/
│       ├── useSkills.ts       # useCachedPromise over `skills list`
│       ├── usePresets.ts
│       └── useAgents.ts
└── PLAN.md
```

---

## 3. CLI bridge (`src/lib/cli.ts`) — the foundation

Everything else is a thin shell over this module.

### 3.1 Binary resolution — `resolveCli(): ResolvedCli`

Port the upstream resolution logic (from `manage-skills/SKILL.md`) to Node, since Raycast's spawn environment has a minimal `PATH`:

1. Let `D = ~/.skills-manager/bin`, `B = D/skills-manager-cli` (`.exe` on Windows — irrelevant here, macOS only).
2. If `D/.version` is non-empty **and** `B` is executable → `{ status: "ok", path: B, source: "app" }`. This copy is published and version-stamped by the desktop app; always prefer it.
3. If exactly one of (`.version` non-empty, `B` exists) holds → `{ status: "bridge_broken" }`. A half-finished publish; **do not fall back to PATH** (upstream is explicit: a PATH copy may predate a safety fix while a desktop app is installed).
4. Otherwise probe `PATH` (plus common locations `~/.cargo/bin`, `/usr/local/bin`, `/opt/homebrew/bin`, since Raycast's `PATH` is minimal) → `{ status: "ok", path, source: "path" }` if found.
5. Nothing found → `{ status: "not_installed" }`.

Cache the result per command session; re-resolve on manual refresh.

### 3.2 Execution — `runCli<T>(args: string[], opts?): Promise<T>`

- `execFile(cliPath, ["--json", ...args])` — absolute path, argument array (no shell, no injection surface), sane timeout (default 30 s; 120 s for install/update which clone git repos).
- Success: parse stdout JSON, return typed payload.
- Failure: parse stderr JSON `{ ok: false, code, message, details? }` into a `CliError { code, message, details }`. If stderr isn't JSON (crash, lock timeout), wrap raw output as `CliError { code: "UNKNOWN" }`.
- The DB/repo lock is shared with the desktop app: surface lock-ish failures with a "Skills Manager app may be busy — retry" toast with a Retry action rather than a bare error.
- Never interactive: destructive commands always get `--yes` (only ever after a Raycast `confirmAlert`, see §6) — upstream notes `--json` mode does **not** auto-confirm.

### 3.3 Types (`src/lib/types.ts`)

Written against real CLI output (run each command once during development and snapshot the JSON). Key fields per upstream docs:

- **Skill** (from `skills list`): `id`, `name`, `description`, `source_type` (`git` | `skillssh` | `local` | `import`), `tags[]`, `presets[]` / `preset_ids[]`, `deployed_to[]`. Note: the legacy `enabled` field is **not** deployment state — never render it.
- **SearchResult** (from `skills search`): `install_ref` (paste straight into `skills install`), `installs` (popularity), `skills_sh_url`.
- **CheckResult** (from `skills check`): `refreshed`, `skipped`, and optional `held_back_removals[]` — test for **presence**, not emptiness.
- **Conflict** (from `TARGET_CONFLICT` details): `conflicts: [{ path, reason }]`.
- **Agent** (from `agents list`): key (e.g. `claude_code`, `codex`), display name, enabled, target path.
- **Preset**, **RepoStatus** (`repo status`: base dir, counts, active preset).

---

## 4. Command specs (Raycast-native UI)

All commands follow stock Raycast idioms: `List` with `searchBarPlaceholder`, `List.Dropdown` for filters, `List.Item.Detail` / `Detail` with `Metadata`, `ActionPanel` with sections and standard shortcuts, `Toast` for async feedback, `confirmAlert` for destructive steps, `Icon`/`Color` from the API — no custom chrome.

### 4.1 My Skills (`my-skills.tsx`)

- **List** backed by `useCachedPromise(() => runCli(["skills", "list"]))` — cached render first, revalidate in background.
- **Search bar dropdown filter**: All / by Tag / by Preset / by Agent / Untagged / No Preset. Filters map to native CLI flags (`--tag`, `--preset`, `--deployed-to`, `--untagged`, `--no-preset`); tag & preset option lists come from `skills tag list` and `presets list`. Text search filters client-side over the cached list.
- **List item**: title = name; accessories = tag pills (`List.Item.Accessory` tags), deployed-agent icons, source-type icon (git / skills.sh / local).
- **Detail** (`List.Item.Detail` toggle via `⌘I`, default off): description + Metadata (source, tags, presets, deployments with agent target paths from `skills status`).
- **ActionPanel** (shared component `SkillActions`, reused from Search after install):
  - *Deploy to Agent…* — submenu of enabled agents (from `useAgents`), multi-step not needed: one agent per action invocation; `skills deploy <skill> --agent <key>`; on `TARGET_CONFLICT` push `DeployConflict` screen (§5.1).
  - *Undeploy from Agent…* — submenu of agents this skill is deployed to.
  - *Update Skill* — `skills update <id>`; handle `held_back_removals` (§5.2).
  - *Tags* section — Add Tag (Form), Remove Tag (submenu), driven by `skills tag add/remove`.
  - *Open in skills.sh* / *Copy Install Ref* when source is skillssh.
  - *Danger zone*: **Remove Skill** (`⌃X`, `Action.Style.Destructive`) — `confirmAlert` stating it deletes the library copy, **all** deployed copies across agents, and the DB row, irreversibly; then `skills remove <id> --yes`.
  - *Refresh* (`⌘R`) — revalidate.

### 4.2 Search Skills (`search-skills.tsx`)

- **List with `throttle`**, `onSearchTextChange` → `runCli(["skills", "search", text, "--limit", "10"])` via `useCachedPromise` keyed on text. Empty state before typing: brief hint that this searches the skills.sh marketplace.
- **List item**: title = skill name; subtitle = repo; accessories = install count (formatted `12.3k`). Per upstream guidance, install count is the trust signal — sort as returned (API order), show counts prominently; items under 100 installs get a `⚠` accessory tooltip suggesting a look at the source repo first.
- **Actions**:
  - **Install to Library** — `skills install <install_ref>`; on success show Toast with primary action **“Deploy to Agent…”** (because install is library-only — upstream pitfall #1: “installed but doesn't appear in the agent”). Choosing an agent runs `skills deploy`.
  - *Install and Deploy…* — submenu of enabled agents; runs install then deploy in sequence, verifying with `skills status` after.
  - *Open in skills.sh* (`Action.OpenInBrowser`), *Copy Install Ref*.
- Already-installed results (name matches library list) get a checkmark accessory and their actions switch to the library `SkillActions`.

### 4.3 Presets (`presets.tsx`)

- **List** from `presets list`; accessories = skill count, deployed-agent icons (from `presets status`).
- **Detail**: member skills, per-agent deployment state.
- **Actions**:
  - **Deploy Preset** — default (no `--agent`) targets all enabled coding agents; submenu variant for a single agent. `confirmAlert` not needed (additive), but show result toast with per-target summary; `TARGET_CONFLICT` → `DeployConflict`.
  - **Undeploy Preset** — no-agent form intentionally removes the preset's actual target rows *everywhere*, including agents now disabled/unregistered (this is the upstream-blessed "turn it off everywhere"); submenu for single agent.
  - *Add Skill to Preset…* / *Remove Skill from Preset…* — organization-only; the UI copy must say deployment is unchanged (upstream pitfall #2) and offer a follow-up “Deploy now?” toast action.
  - *Create Preset* (Form: name, description), *Rename*.
  - **Delete Preset** — destructive style + `confirmAlert` + `--yes`.

### 4.4 Agents (`agents.tsx`) — Phase 2

- **List** from `agents list`: icon, display name, enabled state (green/gray dot accessory), target path as subtitle.
- **Actions**:
  - *Enable Agent* — note in confirm copy: also re-syncs the legacy active preset if one exists.
  - **Disable Agent** — destructive style + `confirmAlert` spelling out that it **removes every managed deployment for that agent**; suggest `skills undeploy`/`presets undeploy` in the alert message when the user might only want one skill gone.
  - *Show Deployed Skills* — pushes a filtered My Skills view (`--deployed-to <key>`).
  - *Copy Target Path*, *Open Target Path in Finder*.

### 4.5 Check Updates (`check-updates.tsx`) — Phase 2

- On open: `skills check --all` with a loading state. Sections: **Updates available**, **Up to date**, **Skipped** (local-only skills, `skipped: true` — shown with an explanatory accessory, with a *Set Git Source…* pointer to the terminal command rather than an in-extension flow).
- **Actions**: *Update* (single), *Update All* (`skills update --all`), each reporting `refreshed: true` counts in the completion toast.
- `held_back_removals` handling per §5.2.

---

## 5. Error & edge-case handling (the part that must not be sloppy)

### 5.1 `TARGET_CONFLICT` on deploy

The CLI refuses the whole batch and deletes nothing. The extension must never bury this in a failure toast. `DeployConflict` component (a `Detail` pushed onto the stack):

- Lists each conflicting `path` + `reason`, states explicitly that nothing at those paths was touched and nothing else in the batch was applied.
- Recovery actions: **Adopt into Library** (`skills adopt <path>` for that specific path, after a confirm), **Reveal in Finder**, **Copy Path**. “Move it aside and retry” stays a manual step — the extension never deletes or moves user files.

### 5.2 `held_back_removals` on update

`refreshed: false` **with** `held_back_removals` is not a failure and must not be retried: the CLI protected files the new version would delete, the skill is untouched on its old version, and there is **no CLI override flag**. Show the held-back paths (prefixed `library:` or agent key) in a Detail view and tell the user only the desktop app can confirm and proceed. Also warn (static hint in the view) that files the user *edited* which the new version also ships are overwritten silently — held-back only covers deletions.

### 5.3 CLI unavailable

- `not_installed` → full-screen `CliMissing` Detail: install instructions (`brew install --cask skills-manager`), link to the repo, *Refresh* action.
- `bridge_broken` → distinct screen: “Open the Skills Manager app once — it republishes the CLI”, and explicitly *not* falling back to any other binary. *Refresh* action to re-resolve.

### 5.4 General

- Every mutating action: `Toast.Style.Animated` while running → `Success` with a concrete summary (“Deployed react-best-practices to Claude Code”) or `Failure` with the CLI's `message` and a *Copy Error* action.
- After any mutation, revalidate the affected cached lists (skills, presets, agents) so accessories stay truthful.
- Timeouts / non-JSON stderr → generic failure toast + Retry action (desktop app may hold the repo lock).

---

## 6. Destructive-action policy

| Action | Guard |
|---|---|
| `skills remove` | `confirmAlert` (destructive primary) → `--yes`. Copy: deletes library copy + all agent deployments + DB row; irreversible without reinstall. |
| `presets delete` | `confirmAlert` → `--yes`. |
| `agents disable` | `confirmAlert` → run. Copy: removes *every* managed deployment for the agent. |
| `skills tag delete` (global) | `confirmAlert` → `--yes`. (Phase 2, inside tag management.) |
| `set-source --force` | Never. Not offered. |
| Anything with `--dry-run` support in bulk | Prefer showing the dry-run result before the real run where the UI flow allows (adopt does this always). |

`confirmAlert` always uses `Alert.ActionStyle.Destructive` for the primary action and names the exact object (“Remove ‘react-best-practices’?”).

---

## 7. Manifest (`package.json`) sketch

```jsonc
{
  "name": "skills-manager",
  "title": "Skills Manager",
  "description": "Manage your shared AI agent-skill library — search, install, deploy, and organize skills across Claude Code, Codex, Cursor and 50+ agents via skills-manager-cli.",
  "icon": "icon.png",
  "platforms": ["macOS"],
  "license": "MIT",
  "commands": [
    { "name": "my-skills",     "title": "My Skills",     "description": "Browse and manage the skill library",              "mode": "view" },
    { "name": "search-skills", "title": "Search Skills", "description": "Search the skills.sh marketplace and install",     "mode": "view" },
    { "name": "presets",       "title": "Presets",       "description": "Deploy, undeploy and organize skill presets",      "mode": "view" },
    { "name": "agents",        "title": "Agents",        "description": "View detected agents and toggle enablement",       "mode": "view" },
    { "name": "check-updates", "title": "Check Updates", "description": "Check for and apply skill updates",                "mode": "view" }
  ],
  "preferences": [
    {
      "name": "cliPath",
      "title": "CLI Path Override",
      "description": "Optional absolute path to skills-manager-cli. Leave empty to auto-detect (recommended).",
      "type": "textfield",
      "required": false
    }
  ],
  "dependencies": { "@raycast/api": "^1.x", "@raycast/utils": "^1.x" }
}
```

The `cliPath` preference bypasses auto-detection entirely when set (power-user escape hatch, e.g. `--skills-root` setups stay out of scope for the UI but a custom wrapper script can be pointed at).

---

## 8. Milestones

1. **M1 — Bridge:** `cli.ts` + `types.ts` + `errors.ts`; `CliMissing` screens; verified against a live install (snapshot real JSON for the types).
2. **M2 — My Skills:** list, filters, detail, deploy/undeploy, remove, update; `TARGET_CONFLICT` + `held_back_removals` flows.
3. **M3 — Search Skills:** search, install, install-and-deploy, already-installed detection.
4. **M4 — Presets:** list/detail, deploy/undeploy, membership editing, create/delete.
5. **M5 (Phase 2) — Agents + Check Updates**, tag management polish.
6. **M6 — Store readiness:** icon, screenshots, README, `ray lint` clean, category `Developer Tools`.

Each milestone is a commit checkpoint. Manual test matrix per milestone: CLI present (app-published) / CLI on PATH only / bridge broken / not installed; desktop app open vs. closed (lock contention); a skill with a deliberate target conflict.

**All milestones are implemented.** M6 is complete except for Store screenshots, which need a real capture session (see §10).

---

## 9. What the live CLI turned out to do

Captured from `skills-manager-cli` v1.37.0 while building. These are the points where the real behavior was not obvious from the docs, and the code depends on them.

- **Errors go to stderr**, as `{ ok: false, code, error, message, details? }` with a non-zero exit. Both `error` and `message` carry the text. Stdout stays empty on failure.
- **Everything resolves by id, name, or directory basename.** Preset flags accept an id (`skills list --preset <uuid>` works), so the UI passes ids and never has to worry about renames mid-flight.
- **`installed` and `enabled` are independent agent flags.** An agent defaults to `enabled: true` long before it is detected on the machine — 33 of the 53 known agents were `installed: false` on the development machine. "Agents that can receive a deploy" means both flags, which was confirmed against the agent list `presets status` reports for itself. Deploying to a disabled agent fails with `agent is disabled: <name>`, so the UI only ever offers the ready set.
- **`skills show` returns the full `SKILL.md`** in a `markdown` field, plus `skill_file` and `files[]`. That is what the detail view renders — no file reading of our own.
- **`presets show` does not return member skills.** Membership comes from `skills list --preset <ref>`.
- **Deploy payloads diverge**: `skills deploy` returns `skills[]`, `presets deploy` returns `preset_id`/`preset_name` and no `skills[]`. `changed_pairs` is the field common to both and the only one worth reporting, where `0` means "already in place", not a failure.
- **`skills tag list` has two shapes**: bare it returns `string[]` of all distinct tags; with a skill argument it returns `{ skill_id, name, tags }`. The extension only uses the bare form.
- **`skills check` reports `update_status`** as `update_available` / `up_to_date` / `local_only` / `error`, with `skipped: true` for skills that have no upstream to probe.
- **`skills list` has more filters than the docs list**: `--query` and `--source` alongside `--tag`, `--preset`, `--deployed-to`, `--untagged`, `--no-preset`.

## 10. Open questions

- Version compatibility: the CLI evolves with the app. Types are treated as a lower bound and parsed leniently; the Check Updates view carries an "Other" section so a status added by a newer CLI cannot make skills silently disappear.
- Whether `repo status` deserves surfacing (e.g. as an item in Agents or a shared "library health" section). Wired up in `api.ts` but not shown anywhere yet — cheap to add if the need appears.
- Publish to the Raycast Store vs. keep as a private extension. The `author` field is set; publishing still needs a set of screenshots.
