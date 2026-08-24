# Context

A [Raycast](https://raycast.com) extension for [Targetprocess](https://targetprocess.com), published to the
public Raycast Store. It lets you find Targetprocess work items and see what is assigned to you without
opening a browser.

This document is the shared vocabulary and the boundary of the work. Decisions and their reasoning live in
[`docs/adr/`](docs/adr/).

## Vocabulary

Terms used consistently in code, commits and UI copy. Where Targetprocess and Raycast disagree, Targetprocess
wins inside `src/api/` and Raycast wins in the UI layer.

| Term            | Meaning                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instance**    | One Targetprocess installation the user has configured: a label, a base URL, a token, and cached facts about it. A user may have many. Ours, not Targetprocess's. |
| **Base URL**    | The root of an instance, including any path prefix (`https://acme.tpondemand.com`, or `https://tools.corp.local/TargetProcess`). Never assumed to be a bare host. |
| **Assignable**  | Targetprocess's base type for work that can be assigned to someone. The six subtypes we support: UserStory, Bug, Task, Feature, Epic, Request.                    |
| **Entity**      | Any Targetprocess record. Broader than Assignable — includes Release, Project, Iteration, Team. Search reaches these when the type filter allows (ADR-0008).      |
| **Entity type** | The concrete type from `EntityType[Name]`, never a row's own `ResourceType` (always the base type). Drives the row icon and badge.                                |
| **Assignment**  | The link between a user and an Assignable. "My work" is defined by assignments, not by an `AssignedUser` column.                                                  |
| **Entity state**| Where an item sits in its workflow ("In Progress"). Instance-specific and user-configurable — never hardcoded, always ordered by the workflow position the API reports. |
| **Final state** | An entity state Targetprocess marks as terminal (Done, Closed). Excluded by default everywhere.                                                                   |
| **Probe**       | A read-only request whose purpose is to learn what an instance supports, not to fetch data for display.                                                           |
| **Catalogue**   | The entity types an instance reports as searchable, fetched per instance rather than hardcoded (ADR-0008).                                                        |

## What 1.0 is

Three commands:

- **Search Targetprocess** — free-text search, scoped by a type filter that defaults to work items and is drawn
  from the instance's own catalogue. Numeric input resolves as an ID against *any* type, filters or not. Final
  states excluded by default, toggleable.
- **My Work** — every non-final item assigned to you, sectioned by entity state in workflow order, most
  recently modified first within each section.
- **Manage Instances** — add, edit and remove instances. Validates on save and reports what each instance
  supports.

Instances are chosen from a dropdown in the search bar, shared across commands, remembering the last
selection. There is no preferences pane.

## What 1.0 is not

Deliberately out of scope. Each has a home in a later release; none of it is rejected.

- Writes of any kind: state changes, time logging, comments, entity creation
- A detail pane, and therefore any Targetprocess HTML → Markdown rendering
- AI `tools/` and any MCP server
- Querying more than one instance at a time
- Project or team filters
- A `no-view` command that jumps straight to an ID
- A preferences pane
- API v2 queries beyond the capability probe

## Shape of the code

```
src/
  search.tsx           Command entry points. Raycast resolves these by the `name`
  my-work.tsx          in package.json, so they must sit at the root of src/ and
  manage-instances.tsx default-export a component. Thin: wiring only.
  api/                 Targetprocess access. Plain typed functions, no React, no Raycast imports.
  instances/           Instance records: storage, validation, the dropdown.
  components/          Shared list rows, empty states, error states.
  filters/             Turning a type selection into a query plan.
  format/              Rendering an entity as text for somewhere else.
  hooks/               Instances, entity types, the type filter, debouncing.
  icons.ts             Entity type icons (Lucide) and their colours.
  shortcuts.ts         A shortcut type that requires both platforms.
assets/                Ships to users: the icon PNG and the Lucide SVGs it references.
artwork/               Icon sources. Deliberately outside assets/, which is bundled.
scripts/
  probe.mjs            Standalone instance probe. Reads .env.local, prints structure only.
  render-icon.mjs      Renders artwork/extension-icon.svg to the 512x512 PNG the Store requires.
  sync-icons.mjs       Copies the Lucide icons src/icons.ts names into assets/icons.
docs/adr/              Decision records.
```

`src/api/` is the only layer that knows Targetprocess exists, and the only layer with tests. It is kept free
of Raycast imports so that adding AI tools later is a wrapper rather than a rewrite.

## Verified against a live instance

Confirmed by `scripts/probe.mjs` on 2026-08-23, not from documentation. Anything not on this list is still an
assumption.

| Question                     | Answer                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Auth transport for a PAT     | `?access_token=` — the Bearer and Basic headers both return 401. Negotiated per instance (ADR-0002).       |
| Current user                 | `/api/v1/Context` → `LoggedUser.Id` (number), plus `FirstName`, `LastName`, `Email`, `IsAdministrator`.     |
| Assignables base collection  | Exists. `/api/v1/Assignables` answers in ~150 ms. No fan-out needed (ADR-0004).                            |
| Concrete entity type         | **Not** the row's `ResourceType`, which is the base type `Assignable`. Comes from `EntityType[Name]`.       |
| Entity state                 | `EntityState[Name, NumericPriority, IsFinal]` — `NumericPriority` orders the sections, `IsFinal` filters.  |
| Assigned to me               | `where=(AssignedUser.Id eq <id>)`. `AssignedUser.Where(...)` and `Assignments.Where(...)` both return 400. |
| API v2                       | Available on this instance, both `/api/v2/Assignable` and `/api/v2/assignable`.                            |
| Entity browser URL           | `{baseUrl}/entity/{id}` — 302s to the correct board page per type, so one format covers all six.            |
| Date format                  | ASP.NET, not ISO: `/Date(1738066086000+0100)/`. `new Date()` reads that as Invalid Date.                    |
| Filter string literals       | Single quotes, with `\'` escaping an embedded quote. Doubling it (`''`) is a 400.                           |
| Filter booleans              | **Quoted**: `(EntityState.IsFinal eq 'false')`. The bare `eq false` is a 400.                               |
| Combining filters            | `(a) and (b)` works. Wrapping the whole conjunction — `((a) and (b))` — is a 400, so builders must not.     |

The standard row projection that follows from this:

```
include=[Id,Name,EntityType[Name],EntityState[Name,NumericPriority,IsFinal],Project[Name],ModifyDate]
```

## Working on this

- **Credentials never enter the repo or a transcript.** `.env.local` is gitignored before it exists; the probe
  prints key names, types and HTTP statuses, never values.
- **Anything unverified about the Targetprocess API is verified against a real instance**, not against
  documentation. IBM's developer portal blocks automated access, so `/api/v1/index/meta` and `scripts/probe.mjs`
  are the sources of truth.
- Conventional commits, feature branches, PRs. `CHANGELOG.md` is a Store requirement, so commit messages feed it.
- CI runs `ray lint` and `ray build` in one job and the tests in another. Every ESLint warning is an error.

## Definition of done for 1.0

The pull request to [raycast/extensions](https://github.com/raycast/extensions) is open, with icon,
`README.md` and `CHANGELOG.md` in place.
