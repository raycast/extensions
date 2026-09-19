# Raycast v2 Foundation Research

**As of:** 2026-08-31

**Scope:** Evidence needed before planning a modern, local-first personal task manager whose primary human interface is Raycast v2 and whose agent interface is a local MCP server.

This is a research record, not an implementation plan. It separates current platform guarantees from observations, inferences, and questions that require a prototype. It uses only first-party Raycast, MCP, OpenAI, Node.js, SQLite, and Apple sources.

**Current-contract notice (2026-09-06):** The product assumptions below are historical. The implemented product has no Inbox or Sections and includes global Labels. For current behavior, use the [task model](task-model.md), [JSON backup format](json-backup-format.md), and [MCP task-tool contract](mcp-task-tools.md).

## Reading key

- **Confirmed** — explicitly documented by a primary source.
- **Source observation** — directly observed in an official package, schema, repository, or reference extension.
- **Inference** — a product or engineering consequence of confirmed evidence.
- **Unknown** — not settled by the available primary sources and therefore unsafe to assume.

## Assumed product definition

The research holds the agreed scope constant: a complete personal task system with Raycast as the primary human UI; Today as the default view and count (overdue plus today); Inbox; flat projects with optional sections; tasks with title, text note, URL links, priority, and one due value; completed history and recoverable Trash; a compact Quick Add form with optional metadata; and an actual menu-bar extra with Today count, dropdown, and direct completion. One local SQLite store is shared with a Codex-facing local MCP server. V1 excludes accounts, sync, collaboration, OS notifications, recurrence, labels, subtasks, and a public CLI. Personal use comes first, while avoiding choices that foreclose a later public release.

## Executive findings

1. **“Raycast v2” now has two related meanings.** Raycast v2 is the rewritten host product, first announced as a public beta in May 2026 and now described by Raycast as generally available. Separately, the extension package itself has moved to `@raycast/api` 2.x: npm currently tags `2.0.5` as `latest`. A new extension should treat both transitions as current, while recognizing that much of the prose documentation and the Todoist reference extension still targets API 1.x. [Raycast launch post](https://www.raycast.com/blog/the-new-raycast), [current v2 manual](https://manual.raycast.com/new-in-v2.md), [npm package metadata](https://registry.npmjs.org/@raycast/api/2.0.5), [Todoist package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json)

2. **Raycast can provide the requested human surfaces without a native helper.** A normal view command can implement Today, Inbox, projects, deadlines, search, forms, details, and contextual actions. A `menu-bar` command creates a real macOS menu-bar extra with an icon, title/count, sections, submenus, and actions. It can therefore show the Today count and allow direct completion. [command schema](https://www.raycast.com/schemas/extension.json), [Menu Bar commands](https://developers.raycast.com/api-reference/menu-bar-commands.md), [List](https://developers.raycast.com/api-reference/user-interface/list.md), [Form](https://developers.raycast.com/api-reference/user-interface/form.md), [Detail](https://developers.raycast.com/api-reference/user-interface/detail.md)

3. **Quick Add metadata requires a Form.** A command accepts at most three root-search arguments, and their types are only text, password, and a manifest-defined dropdown. The requested required title, dynamic project selection, due-date presets with a custom date picker, and optional notes do not fit that surface. A compact Form supports those controls without static project data or text-encoded dates. [current extension schema](https://www.raycast.com/schemas/extension.json), [arguments lifecycle](https://developers.raycast.com/information/lifecycle/arguments.md), [Form](https://developers.raycast.com/api-reference/user-interface/form.md)

4. **A shared SQLite database is plausible but not guaranteed by a Raycast storage API.** Raycast `LocalStorage` is private to an extension and unsuitable as the canonical store for a separate MCP process. Extensions currently have ordinary Node file access and receive an absolute support directory, so a filesystem database can be shared. The stable database location, reinstall/uninstall behavior, Store-policy acceptability, SQLite runtime versions, and two-process coordination remain validation questions. [Raycast storage](https://developers.raycast.com/api-reference/storage.md), [environment paths](https://developers.raycast.com/api-reference/environment.md), [extension security](https://developers.raycast.com/information/security.md)

5. **MCP stdio is sufficient as the agent interface; a public CLI is not required.** Codex supports local stdio MCP servers, while the current MCP protocol defines a client-launched subprocess with JSON-RPC on stdin/stdout. The current TypeScript SDK can support both the 2026 protocol and older clients. Codex’s official source currently defaults to the legacy protocol path unless its newer protocol mode is enabled, so dual-era compatibility is the prudent current constraint. [Codex MCP documentation](https://developers.openai.com/codex/mcp/), [MCP stdio transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio), [TypeScript SDK packages](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md), [Codex protocol-mode source](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/protocol_mode.rs)

6. **The highest-risk unknown is not task UI; it is the public distribution boundary.** Personal use can run a locally developed extension and a locally configured MCP subprocess. A later Store release has open-source review, package, binary, privacy, and configuration rules. There is no current first-party recipe showing how a Store extension should distribute a sibling local MCP server and establish a stable shared database path. This should be resolved with a small proof and an early Raycast reviewer question before the architecture is made difficult to change. [Store preparation rules](https://developers.raycast.com/basics/prepare-an-extension-for-store.md), [Store publishing workflow](https://developers.raycast.com/basics/publish-an-extension.md), [private extension distribution](https://developers.raycast.com/teams/publish-a-private-extension.md)

## Compact evidence matrix

| Area              | Primary evidence                                                                                                                                                                                                      | Status                           | Constraint for this product                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Product v2        | [v2 manual](https://manual.raycast.com/new-in-v2.md), [technical deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)                                                                  | Confirmed                        | Target the current v2 host; do not infer an always-running extension from its rewritten backend.                      |
| API v2            | [npm metadata](https://registry.npmjs.org/@raycast/api/2.0.5), [registry history](https://registry.npmjs.org/@raycast/api)                                                                                            | Source observation               | Start from the current 2.x scaffold and verify generated output rather than copying an API 1.x template.              |
| Commands          | [schema](https://www.raycast.com/schemas/extension.json), [lifecycle](https://developers.raycast.com/information/lifecycle.md)                                                                                        | Confirmed                        | Use view, no-view, and menu-bar entry points for distinct interactions.                                               |
| Quick Add         | [schema](https://www.raycast.com/schemas/extension.json), [arguments](https://developers.raycast.com/information/lifecycle/arguments.md), [Form](https://developers.raycast.com/api-reference/user-interface/form.md) | Confirmed                        | Use a compact Form for title, dynamic project selection, due-date presets, a custom date picker, and notes.           |
| Menu bar          | [Menu Bar API](https://developers.raycast.com/api-reference/menu-bar-commands.md)                                                                                                                                     | Confirmed                        | Native extra, count title, dropdown, and completion actions are supported.                                            |
| Refresh           | [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md), [launchCommand](https://developers.raycast.com/api-reference/command.md)                                            | Mixed                            | In-extension writes can request refresh; prompt refresh after an external MCP write is unconfirmed.                   |
| Extension data    | [storage](https://developers.raycast.com/api-reference/storage.md), [environment](https://developers.raycast.com/api-reference/environment.md)                                                                        | Confirmed                        | `LocalStorage` cannot be the cross-process source of truth; a shared file location is needed.                         |
| Process boundary  | [security](https://developers.raycast.com/information/security.md), [v2 deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)                                                           | Mixed                            | File access exists today, but command lifecycle remains on-demand and documentation reflects a transition.            |
| Todoist           | [package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json), [source tree](https://github.com/raycast/extensions/tree/main/extensions/todoist/src)                           | Source observation               | Reuse interaction patterns, not its cloud-sync architecture or API 1.x baseline.                                      |
| SQLite            | [Node SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html), [SQLite WAL](https://www.sqlite.org/wal.html)                                                                                     | Confirmed with runtime unknowns  | Multiple readers are straightforward; writers, WAL version safety, migrations, and backup need explicit coordination. |
| MCP transport     | [stdio spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio), [Codex MCP](https://developers.openai.com/codex/mcp/)                                                                  | Confirmed                        | A client-launched local subprocess is enough; keep stdout protocol-only.                                              |
| MCP compatibility | [SDK migration note](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28), [Codex source](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/protocol_mode.rs)                     | Source observation               | Support both legacy and 2026 protocol eras until installed Codex behavior is verified.                                |
| Native helper     | [Apple `NSStatusBar`](https://developer.apple.com/documentation/appkit/nsstatusbar), [Raycast Menu Bar API](https://developers.raycast.com/api-reference/menu-bar-commands.md)                                        | Inference                        | Not needed for the agreed feature set; it would duplicate the status item and add distribution cost.                  |
| Store release     | [preparation rules](https://developers.raycast.com/basics/prepare-an-extension-for-store.md), [publishing](https://developers.raycast.com/basics/publish-an-extension.md)                                             | Confirmed with packaging unknown | Public release is feasible in principle, but bundled MCP delivery/shared-path ownership is not documented.            |
| Toolchain         | [API package](https://registry.npmjs.org/@raycast/api/2.0.5), [CLI](https://developers.raycast.com/information/developer-tools/cli.md)                                                                                | Source observation               | Current package requirements outrank stale prose; build/lint plus Raycast-host smoke testing are required.            |

## 1. What “Raycast v2” concretely means

### 1.1 Product version

**Confirmed.** Raycast announced the new Raycast as a public beta on 2026-05-14 and described it as a ground-up rewrite. The current manual now says Raycast v2 is generally available, replaces Raycast v1, and is the version extension developers should focus on; Raycast can still test v1 during Store review. [launch announcement](https://www.raycast.com/blog/the-new-raycast), [current v2 manual](https://manual.raycast.com/new-in-v2.md)

**Confirmed.** On macOS, v2 requires Apple silicon and macOS 26 Tahoe. Raycast documents import from v1 and gives `npx @raycast/api@latest dev` as the route for importing custom extensions. [Raycast v2 page](https://www.raycast.com/new), [v2 manual](https://manual.raycast.com/new-in-v2.md)

**Confirmed.** The rewritten host is not simply a new extension renderer. Raycast describes a Swift/AppKit macOS shell, a C#/.NET/WPF Windows shell, a React/TypeScript WebView frontend, a long-lived Node backend that includes extension runtime and data access, a Rust core, and typed IPC between them. Extensions remain React, TypeScript, and Node programs. [technical deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)

**Source observation.** The locally installed `/Applications/Raycast.app` inspected on 2026-08-24 reports bundle identifier `com.raycast.macos` and version `2.0.5.0`. This establishes the test machine’s current host, not a general platform promise.

### 1.2 Extension API/package version

**Source observation.** The npm registry currently tags `@raycast/api` `2.0.5` as `latest`. Its engine requirement is Node `>=22.22.2`; it depends on React `19.0.0` and declares peer versions `@types/node` `22.19.17` and `@types/react` `19.0.10`. [2.0.5 package metadata](https://registry.npmjs.org/@raycast/api/2.0.5)

**Source observation.** Registry publication history shows a beta-era `0.65`–`0.71` sequence, an API 1.x line ending at `1.104.25`, and API 2.x general releases beginning with `2.0.3` on 2026-08-19, followed by `2.0.4` and `2.0.5` on 2026-08-21. The current `latest-v0` dist-tag points to `0.71.7`. [full npm registry record](https://registry.npmjs.org/@raycast/api)

**Unknown.** Raycast has not published a current migration guide explaining the skipped `2.0.0`–`2.0.2` numbers or the intended consumer meaning of `latest-v0`. The timing supports an inference that the 0.x tag preserves the v2-beta package channel, but that interpretation is not documented and should not be used as a target-selection rule.

**Source observation.** The compiled CLI in the official 2.0.5 tarball routes normal releases to `com.raycast.macos` and flavored builds to `com.raycast.macos.<flavor>`; it no longer contains the older fallback routing to the classic macOS bundle. This is strong package-level evidence that API 2.x is aligned with the v2 host. [official 2.0.5 tarball](https://registry.npmjs.org/@raycast/api/-/api-2.0.5.tgz)

### 1.3 Documentation inconsistencies

The official documentation is in transition and should not be treated as internally version-consistent:

- **Source observation.** The public API changelog currently ends at API `1.103.0`, even though npm’s latest release is `2.0.5`. [developer changelog](https://developers.raycast.com/misc/changelog.md), [npm 2.0.5 metadata](https://registry.npmjs.org/@raycast/api/2.0.5)
- **Source observation.** Getting Started says Node `22.14` or later, while the current package requires Node `>=22.22.2`. [Getting Started](https://developers.raycast.com/basics/getting-started.md), [npm 2.0.5 metadata](https://registry.npmjs.org/@raycast/api/2.0.5)
- **Source observation.** Manifest prose describes one minute as the minimum background interval, while the live JSON schema and dedicated background-refresh page allow ten seconds. [manifest prose](https://developers.raycast.com/information/manifest.md), [live schema](https://www.raycast.com/schemas/extension.json), [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md)
- **Source observation.** The official Todoist extension still depends on `@raycast/api ^1.104.19`, so it is not proof that its package setup is the current API 2.x baseline. [Todoist package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json)

**Confirmed.** Raycast states that the app manages the extension runtime, including Node, and checks extension API compatibility. An incompatible extension can prompt the user to update Raycast. [extension versioning](https://developers.raycast.com/information/versioning.md)

**Planning constraint.** For version-sensitive facts, the live schema, current npm package/tarball, newly generated scaffold, and actual v2 host behavior should outrank older prose. Store preparation also explicitly tells authors to use the latest API version. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

## 2. Supported extension and UI model

### 2.1 Entry points and lifecycle

**Confirmed.** The manifest supports three command modes: `view`, `no-view`, and `menu-bar`. A view command renders a Raycast UI, a no-view command performs work without opening the main window, and a menu-bar command renders a macOS menu-bar extra. [live extension schema](https://www.raycast.com/schemas/extension.json), [command lifecycle](https://developers.raycast.com/information/lifecycle.md)

**Confirmed.** Commands are invoked, run, and unloaded according to Raycast’s lifecycle; resource limits still apply. The host’s long-lived Node backend does not constitute a documented promise that a particular extension command is always running. [command lifecycle](https://developers.raycast.com/information/lifecycle.md), [technical deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)

**Confirmed.** An extension has one TypeScript or TSX source entry point per command declared in its manifest. TypeScript is the documented and scaffolded default. [file structure](https://developers.raycast.com/information/file-structure.md)

### 2.2 Host UI capabilities

**Confirmed.** A `List` provides searchable rows, sections, accessories, empty/loading states, built-in filtering, and contextual actions. That directly fits Today, Inbox, flat project, deadline, completed, and Trash lists. [List API](https://developers.raycast.com/api-reference/user-interface/list.md)

**Confirmed.** A `Form` provides text areas, date pickers, dropdowns, checkboxes, validation, controlled or uncontrolled values, and actions. Raycast recommends its form utilities for validation and submission. This is the supported surface for full task metadata. [Form API](https://developers.raycast.com/api-reference/user-interface/form.md)

**Confirmed.** A `Detail` renders Markdown plus metadata and actions. It can display task notes and URL fields without requiring a custom web view. [Detail API](https://developers.raycast.com/api-reference/user-interface/detail.md)

**Confirmed.** An `ActionPanel` supplies ordered contextual actions and keyboard shortcuts; Raycast assigns default keys to the leading actions. Navigation uses Raycast’s push/pop APIs, and Store rules require the standard Navigation API rather than a custom navigation system. [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel.md), [Navigation](https://developers.raycast.com/api-reference/user-interface/navigation.md), [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

**Inference.** These are declarative host components, not an arbitrary DOM/CSS canvas. The requested task system fits the supported model, but pixel-level custom layout, freeform window chrome, and an arbitrary custom menu-bar popover should not be assumed.

### 2.3 Product surface fit

The agreed product scope maps cleanly onto current primitives:

| Product need                                  | Supported Raycast primitive          | Evidence                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today default, overdue plus today             | List sections and filtering          | [List](https://developers.raycast.com/api-reference/user-interface/list.md)                                                                                          |
| Inbox, projects, sections, deadlines          | List commands, dropdowns, navigation | [List](https://developers.raycast.com/api-reference/user-interface/list.md), [Navigation](https://developers.raycast.com/api-reference/user-interface/navigation.md) |
| Task title, note, URL, priority, due value    | Form and Detail                      | [Form](https://developers.raycast.com/api-reference/user-interface/form.md), [Detail](https://developers.raycast.com/api-reference/user-interface/detail.md)         |
| Complete, edit, move, trash, restore          | Action Panel actions                 | [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel.md)                                                                          |
| Fast title capture                            | No-view command arguments            | [arguments](https://developers.raycast.com/information/lifecycle/arguments.md)                                                                                       |
| Count and direct completion in macOS menu bar | MenuBarExtra title/items             | [Menu Bar commands](https://developers.raycast.com/api-reference/menu-bar-commands.md)                                                                               |

## 3. Quick Add: capabilities and limits

**Confirmed.** A command can define no more than three root-search arguments. Supported types are text, password, and dropdown; arguments are positional, and required arguments must come before optional arguments. Dropdown choices are manifest-defined static data. [live extension schema](https://www.raycast.com/schemas/extension.json), [arguments lifecycle](https://developers.raycast.com/information/lifecycle/arguments.md)

**Confirmed.** Raycast generates typed `Arguments.*` values for a command. Arguments appear in root search and are passed to the command when it is launched. [arguments lifecycle](https://developers.raycast.com/information/lifecycle/arguments.md)

**Inference.** There is no root-argument date picker, and a static dropdown cannot reflect projects created in the local database without rewriting the manifest. The requested Quick Add contract therefore uses a compact Form:

- title is required;
- Project is a dynamic dropdown that defaults to Inbox and includes nested sections;
- Due Date offers None, Today, Tomorrow, End of Week, and Custom presets;
- the custom date picker appears only when Custom is selected;
- notes use an optional text area.

**Product decision.** The compact Form replaces the earlier title-only root-argument shortcut. The product still excludes natural-language parsing in v1.

**Confirmed.** Command aliases and global hotkeys are user-configurable in Raycast. Typing an alias followed by a space focuses the first command argument. The extension does not need to invent a separate hotkey manager. [aliases and hotkeys manual](https://manual.raycast.com/command-aliases-and-hotkeys.md)

**Source observation.** Todoist uses two complementary surfaces: a no-view quick-add command with root arguments and a separate view command with a metadata-rich Form. Its quick command sends Todoist’s natural-language string to Todoist, which is not transferable to this product, while the surface split is transferable. [Todoist quick add](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/quick-add-task.tsx), [Todoist create form](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/create-task.tsx)

## 4. Menu-bar behavior

### 4.1 What the API supports

**Confirmed.** A `menu-bar` command creates an actual macOS system menu-bar item. `MenuBarExtra` accepts an icon, title, tooltip, loading state, and child items. Children can be items, submenus, sections, and separators. An item can have an `onAction`, shortcut, alternate item, icon, title, subtitle, and tooltip. [Menu Bar commands](https://developers.raycast.com/api-reference/menu-bar-commands.md)

**Inference.** The requested visible state—task icon plus the count of overdue-and-today tasks—fits `icon` plus a short `title`. The dropdown can group Today tasks and expose completion directly through `onAction`; links to Today, Inbox, projects, or Add Task can launch other commands.

**Confirmed.** macOS controls whether a status item is visible when space is constrained. Raycast recommends short titles, cached data, fast rendering, and eventually setting `isLoading` to false. [Menu Bar commands](https://developers.raycast.com/api-reference/menu-bar-commands.md)

### 4.2 Lifecycle and cached restoration

**Confirmed.** A menu-bar command is not a permanently executing extension process. On first run Raycast executes the command; when the menu opens, the command loads and remains active while the menu is open. After the first successful run, Raycast can restore the last rendered menu-bar item from its database without re-executing the command after restart. [Menu Bar lifecycle](https://developers.raycast.com/api-reference/menu-bar-commands.md)

**Implication.** The last rendered count can persist visually while the command is unloaded. Correctness after external database changes therefore depends on the next command load or scheduled refresh, not on a live React subscription.

### 4.3 Background refresh

**Confirmed.** Background refresh is available only for no-view and menu-bar commands. The current dedicated page and live schema permit intervals down to ten seconds. Scheduling is approximate and energy-aware, a run can be delayed, and Raycast dynamically limits execution to prevent overlap. Shared state must tolerate races. [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md), [live extension schema](https://www.raycast.com/schemas/extension.json)

**Confirmed.** For Store-installed extensions, a background command is initially inactive and is activated after the user first opens it or configures its preferences. Raycast advises choosing the longest acceptable interval and keeping work brief. [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md)

**Documentation conflict.** Manifest prose still says the minimum interval is one minute. Because the live schema and the dedicated current lifecycle page both say ten seconds, ten seconds is the stronger current contract, but actual cadence must still be measured. [manifest prose](https://developers.raycast.com/information/manifest.md), [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md)

### 4.4 Immediate refresh after mutations

**Confirmed.** `launchCommand` can invoke another command in the same or another extension, in user or background launch context, with arguments, context, and fallback text. [command API](https://developers.raycast.com/api-reference/command.md)

**Source observation.** Todoist’s mutation paths call a same-extension helper that launches its menu-bar command in the background, producing a prompt refresh after an in-extension change. [Todoist menu helper](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/helpers/menu-bar.ts)

**Unknown.** A separately launched MCP process cannot directly call the Raycast extension API. No official source documents a supported cross-process wake-up that guarantees immediate menu refresh after an MCP write. The safe current expectation is eventual refresh on the next menu open or background run. A Raycast deep link may open a command, but it can require confirmation and is documented as a command launch mechanism, not a silent refresh RPC. [deep links](https://developers.raycast.com/information/lifecycle/deeplinks.md)

## 5. Preferences, hotkeys, and deep links

**Confirmed.** Manifest preferences support text fields, passwords, checkboxes, dropdowns, application pickers, files, and directories. Raycast generates typed preference access, and commands can open extension or command preference screens. [live schema](https://www.raycast.com/schemas/extension.json), [preferences API](https://developers.raycast.com/api-reference/preferences.md)

**Confirmed.** Store guidelines require using Raycast preferences rather than a separate settings command. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

**Confirmed.** Users configure global command hotkeys and aliases in Raycast, including the current v2 modifier behaviors. [aliases and hotkeys manual](https://manual.raycast.com/command-aliases-and-hotkeys.md)

**Confirmed.** Enabled commands can be opened with `raycast://extensions/<owner>/<extension>/<command>`. A deep link can carry launch type, arguments, context, and fallback text; Raycast documents confirmation behavior for opening it. [deep links](https://developers.raycast.com/information/lifecycle/deeplinks.md)

**Inference.** Preferences are appropriate for display defaults and optional Quick Add behavior. Hotkeys remain user-owned. Deep links are useful for focusing a task view, but should not be treated as a durable local IPC protocol between MCP and Raycast.

## 6. Process, filesystem, and storage boundaries

### 6.1 Extension isolation and file access

**Confirmed.** Raycast currently runs extensions in isolated V8 contexts with separate event loops and memory limits while using a managed, verified Node runtime. Its security documentation says extensions are not additionally sandboxed from ordinary file and network access today, although this may change; access to protected macOS locations depends on permissions available to Raycast. [extension security](https://developers.raycast.com/information/security.md)

**Documentation boundary.** The security page describes extension execution in a child Node process, while the v2 deep dive describes a single long-lived Node backend containing the extension runtime. These can describe different abstraction layers or a transition, but the public sources do not completely reconcile them. The stable product constraint is per-extension isolation and on-demand command lifecycle, not a promised operating-system process topology. [extension security](https://developers.raycast.com/information/security.md), [technical deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)

### 6.2 Raycast storage APIs

**Confirmed.** `LocalStorage` persists values in Raycast’s encrypted local database, shares them between commands of the same extension, and prevents other extensions from accessing them. Raycast says it is not intended for large data and recommends files under `environment.supportPath` for larger datasets. [storage API](https://developers.raycast.com/api-reference/storage.md)

**Confirmed.** `environment.supportPath` and `environment.assetsPath` are absolute paths. The environment API also exposes Raycast version, launch type, and current entry-point metadata. In API 2.x, the package types prefer `entryPointType`, `entryPointName`, and `entryPointMode`; older command-oriented names are deprecated. [environment API](https://developers.raycast.com/api-reference/environment.md), [official 2.0.5 package](https://registry.npmjs.org/@raycast/api/-/api-2.0.5.tgz)

**Inference.** `LocalStorage` cannot be the canonical task store because a separate MCP process is outside the extension’s storage boundary. A file-backed database is the appropriate class of shared primitive under today’s platform behavior.

**Unknown.** The best canonical path is not settled by the docs. `supportPath` is convenient for the extension, but the MCP process needs a stable way to discover it, and later public distribution raises ownership, upgrade, uninstall, and permission questions. A product-specific Application Support directory may be more stable, but that is an architectural inference to test, not a Raycast guarantee.

**Security implication.** Even though broad file access exists today, the product should confine itself to one explicit product directory. Task titles, notes, and URLs are untrusted data: displaying or returning a URL is different from executing it, and neither Raycast nor MCP should automatically run content from a task.

## 7. Todoist as the reference architecture

### 7.1 What the official extension actually does

**Source observation.** The first-party-hosted Todoist extension declares My Tasks, quick add, create task, menu bar, search, and project surfaces. Its My Tasks view defaults to Today by preference; its menu-bar command has a background interval; and it also exposes Raycast AI tools. [Todoist package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json), [Todoist source tree](https://github.com/raycast/extensions/tree/main/extensions/todoist/src)

**Source observation.** Its menu renders a count or celebration state, grouped task sections, and links to Inbox, Today, Upcoming, Completed, and Create. Each menu task exposes contextual actions including opening, focusing, completing, changing dates or priority, and deleting. [Todoist menu](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/menu-bar.tsx), [Todoist menu task](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/components/MenubarTask.tsx)

**Source observation.** Todoist keeps cached remote sync data, derives a smaller menu data set, performs optimistic mutations, and requests a background launch of its menu command after mutations. [Todoist sync hook](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/hooks/useSyncData.ts), [Todoist cached data](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/hooks/useCachedData.ts), [Todoist menu helper](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/helpers/menu-bar.ts)

**Source observation.** Todoist’s current `main` package depends on `@raycast/api ^1.104.19` and `@raycast/utils ^2.2.6`. It is therefore an official compatibility and interaction reference, not a v2-native package baseline. [Todoist package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json)

### 7.2 What transfers

The following patterns transfer well to a local task manager:

- Today as the default home view;
- a fast title-first no-view capture command plus a full create/edit Form;
- a menu-bar count, grouped tasks, direct completion, and links into larger views;
- reusable contextual actions across list, detail, and menu surfaces;
- cached-first rendering and explicit refresh after mutations;
- focused commands for search, project, and date-based navigation.

These are source-code observations from the official [Todoist source tree](https://github.com/raycast/extensions/tree/main/extensions/todoist/src), not requirements imposed by Raycast.

### 7.3 What does not transfer

The following Todoist architecture is specific to a cloud service or out of the agreed v1 scope:

- OAuth/token setup and Todoist HTTP APIs;
- remote sync tokens, cached remote mirrors, and network retry/error behavior;
- Todoist natural-language Quick Add;
- Todoist IDs, labels, assignees, collaboration, recurrence, and subtasks;
- the current API 1.x dependency baseline.

The distinction is visible in Todoist’s [API layer](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/api.ts), [API wrapper](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/helpers/withTodoistApi.tsx), [quick add](https://github.com/raycast/extensions/blob/main/extensions/todoist/src/quick-add-task.tsx), and [package](https://raw.githubusercontent.com/raycast/extensions/main/extensions/todoist/package.json).

## 8. SQLite and multi-process correctness

### 8.1 Available runtime API

**Confirmed.** Node’s built-in `node:sqlite` module includes synchronous database, connection, prepared statement, session, and backup APIs. It was added in Node 22.5; the command-line flag ceased to be required in Node 22.13. The documented Node 22 module is still marked Stability 1.1, active development. [Node 22 SQLite documentation](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)

**Confirmed.** The current `@raycast/api` package only guarantees Node `>=22.22.2`; it does not document the exact Node or embedded SQLite patch version in every Raycast host. [API 2.0.5 metadata](https://registry.npmjs.org/@raycast/api/2.0.5)

**Source observation.** Raycast Utils’ `executeSQL` helper opens `node:sqlite` in read-only mode and falls back to the `sqlite3 --readonly` command. It is a query helper, not a suitable canonical write layer. [executeSQL source](https://github.com/raycast/utils/blob/main/src/executeSQL.ts), [SQL utility source](https://github.com/raycast/utils/blob/main/src/sql-utils.ts)

### 8.2 Concurrency properties

**Confirmed.** SQLite permits simultaneous readers but only one writer. `BEGIN IMMEDIATE` starts a write transaction immediately and can return `SQLITE_BUSY` if another writer is active. [SQLite transaction documentation](https://sqlite.org/lang_transaction.html)

**Confirmed.** WAL mode normally allows readers and a writer to proceed concurrently, but all processes must be on the same host. WAL adds persistent `-wal` and `-shm` files, checkpoints, and a one-writer constraint; committed data may reside in the WAL. [SQLite WAL documentation](https://www.sqlite.org/wal.html)

**Confirmed.** A serious WAL-reset race affecting multi-connection writers and checkpointers was fixed in SQLite 3.51.3, with backports to 3.50.7 and 3.44.6. Node 22.22.3 updated its bundled SQLite to 3.51.3, but `@raycast/api` permits Node 22.22.2, so package metadata alone does not prove the Raycast host has the fixed SQLite. [SQLite WAL bug notice](https://www.sqlite.org/wal.html#the_wal_reset_bug), [Node 22.22.3 release](https://github.com/nodejs/node/releases/tag/v22.22.3)

**Confirmed.** A busy timeout is connection-specific. Raw SQLite requires foreign-key enforcement to be enabled per connection unless the embedding changes the default; Node’s wrapper exposes an `enableForeignKeyConstraints` option and currently defaults it to true. A database’s `user_version` is application-owned schema metadata. [busy timeout](https://sqlite.org/pragma.html#pragma_busy_timeout), [foreign keys](https://sqlite.org/foreignkeys.html), [user version](https://sqlite.org/pragma.html#pragma_user_version), [Node SQLite options](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)

### 8.3 Product constraints

The evidence produces these constraints without selecting a final database library or journal mode:

- The Raycast extension and MCP server are independent connections and potential writers.
- Every writer must share the same schema rules, transaction discipline, identifier semantics, and Trash/completion behavior.
- Writes should use prepared parameters and short transactions, with an explicit bounded busy policy.
- Migrations need a monotonic schema version and must tolerate two processes starting simultaneously: one writer acquires the lock, the other re-reads the result after waiting.
- A migration must be transactional where SQLite permits it, idempotent at process boundaries, and tested under interruption.
- Foreign-key behavior should be set or verified on every connection rather than inherited from a wrapper default.
- WAL must not be selected until the embedded SQLite versions in both processes are measured and a concurrency stress test passes.
- The database must stay on a local filesystem, not an iCloud/network-synchronized path, because WAL’s shared-memory model is same-host and copying live files is not a sync protocol. [SQLite WAL](https://www.sqlite.org/wal.html)
- A backup must use a SQLite-aware backup/export mechanism. Copying only the main `.sqlite` file can omit committed WAL contents. Node exposes an online backup API, but its availability in the actual Raycast runtime must be verified. [Node SQLite backup](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html), [SQLite WAL persistence](https://www.sqlite.org/wal.html)

**Domain implication.** A single “due” concept still needs two storage meanings: an all-day local calendar date and a date-time instant with timezone semantics. “Today” equals incomplete tasks whose all-day date is today-or-earlier plus date-time tasks whose instant falls before the local end of today. Timezone changes and DST boundaries must be explicit test cases; treating every due value as an unqualified JavaScript `Date` would lose product meaning.

## 9. MCP for Codex

### 9.1 Transport and lifecycle

**Confirmed.** Under the 2026-07-28 stdio transport, the MCP client launches the server subprocess. The server receives JSON-RPC messages on stdin and writes protocol messages on stdout, one message per line. Logging must go to stderr; writing non-protocol output to stdout can corrupt the session. The client closes stdin during shutdown and may terminate the process afterward; unexpected exit is handled as a broken connection that the client may restart. [MCP stdio transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)

**Confirmed.** Codex Desktop, CLI, and IDE extension support local stdio MCP servers through shared configuration. Configuration may be global or project-scoped in a trusted `.codex/config.toml` and can define command, arguments, working directory, environment forwarding, startup timeout, per-tool timeout, enabled/disabled tools, and approval policies. [Codex MCP documentation](https://developers.openai.com/codex/mcp/)

**Inference.** For this single-user, local-first product, stdio removes the need for a daemon, listening port, HTTP authentication, and a public CLI. The operating-system user account, Codex configuration, executable path, and database file permissions form the trust boundary.

### 9.2 Protocol compatibility

**Confirmed.** The current TypeScript SDK v2 is split into `@modelcontextprotocol/server` and `@modelcontextprotocol/client`; stdio servers use the server package’s `serveStdio`. The earlier single-package `@modelcontextprotocol/sdk` is the v1 line. [TypeScript SDK package guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md)

**Confirmed.** The v2 SDK migration guide says the current stdio helper can support the 2026-07-28 protocol and legacy protocol eras; rejecting legacy clients is an explicit choice rather than the default. [SDK 2026 protocol migration](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)

**Source observation.** Current Codex source includes a 2026-07-28 protocol mode, but defaults to the legacy/2025-06-18 path unless newer protocol selection is enabled. Its discovery tests exercise the modern stdio path. Product documentation does not promise the installed build’s exact mode. [Codex protocol mode](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/protocol_mode.rs), [Codex 2026 stdio discovery test](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/tests/mcp_2026_stdio_discovery.rs)

**Constraint.** The server should remain compatible with both eras through the official SDK rather than forcing 2026-only mode until the actual Codex release used by the product is verified.

### 9.3 Tool design and safety

**Confirmed.** MCP tools are model-controlled and should have deterministic names/descriptions and object-shaped JSON Schema inputs. The current specification supports `outputSchema`, `structuredContent`, and a text content fallback. It distinguishes protocol errors from tool-execution errors and states that annotations are untrusted hints. Servers should validate inputs, enforce access controls, rate-limit as appropriate, sanitize outputs, and avoid leaking sensitive data; clients should support confirmation, timeouts, and auditability. [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

**Product implications.** The task server should expose bounded domain operations rather than arbitrary SQL or shell access. Stable task/project IDs, deterministic ordering, explicit pagination and result bounds, structured results plus text fallback, and accurate read-only/destructive/idempotent annotations make agent behavior inspectable. Recoverable Trash means ordinary deletion need not be irreversible; permanent purge need not be exposed in the first agent surface. Notes and URLs must be returned as data, never executed.

**Lifecycle implication.** The server must keep stdout protocol-pure, send logs to stderr, handle stdin EOF and cancellation, close its database connection cleanly, and tolerate being launched again after a crash. The database path and any permission failure should produce a clear tool error rather than silently creating a second database.

## 10. Is a native macOS helper needed?

**Confirmed.** AppKit’s `NSStatusBar`/`NSStatusItem` can create a system status item with a button, icon or title, menu, action, or custom view. A separately installed helper or login item can be managed through `SMAppService`. [Apple `NSStatusBar`](https://developer.apple.com/documentation/appkit/nsstatusbar), [Apple `NSStatusItem`](https://developer.apple.com/documentation/appkit/nsstatusitem), [Apple `SMAppService`](https://developer.apple.com/documentation/servicemanagement/smappservice)

**Inference.** A native helper is not needed for the agreed v1 behavior because Raycast already supplies the real menu-bar item, count title, dropdown hierarchy, and direct actions. A helper that also exposes a status item would produce a second icon and add a signed/notarized app, login-item lifecycle, update channel, another database process, and a second distribution surface.

**Potential future justifications, not current requirements:**

- the indicator must remain available when Raycast is not running;
- an MCP write must update the menu in less than the host’s supported refresh cadence;
- the panel requires custom AppKit/SwiftUI content that `MenuBarExtra` cannot express;
- the product evolves into an independent macOS app for which Raycast is only one client.

Until one of those becomes a requirement and is validated, the native helper would add more system than value.

## 11. Packaging, distribution, privacy, and security

### 11.1 Personal use

**Confirmed.** Raycast supports local custom-extension development with its API CLI. Private Store publishing exists for organizations, but it is an organization feature. [Getting Started](https://developers.raycast.com/basics/getting-started.md), [private extension publishing](https://developers.raycast.com/teams/publish-a-private-extension.md)

**Inference.** For the agreed personal-first phase, a locally developed/imported extension plus a locally configured Codex MCP server is the lowest-friction distribution model. It does not require an account system or public Store review.

### 11.2 Public Raycast Store release

**Confirmed.** Store submissions are pull requests to Raycast’s public extensions repository and pass automated checks plus human review before merge. Public extensions are open source, reviewed, and updated through the Store. [publishing workflow](https://developers.raycast.com/basics/publish-an-extension.md), [extension security](https://developers.raycast.com/information/security.md)

**Confirmed.** Raycast’s current checklist requires the latest API, npm and a lockfile, appropriate platform declaration, successful build and lint, an MIT license, a 512-pixel PNG icon, US-English copy, screenshots and changelog as applicable, standard Preferences/ActionPanel/Navigation APIs, and no external analytics. It restricts binary dependencies and requires trusted, verifiable downloads rather than opaque or heavy binaries. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

**Confirmed.** Direct use of Keychain is rejected in favor of Raycast preference mechanisms for secrets. This product has no account/token in v1, but the rule illustrates that public extensions must follow host-managed configuration conventions. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

**Unknown and material.** No current first-party source provides a Store-approved pattern for distributing a sibling local stdio MCP executable with an extension, registering it in Codex, or jointly owning a database outside the extension’s support directory. Questions include:

- whether compiled/bundled MCP JavaScript is accepted as extension source or treated as an additional binary;
- whether the extension may install or expose a stable executable path;
- whether external setup may be documented but not automated;
- which component owns database creation, migrations, upgrades, and uninstall cleanup;
- how a reinstall preserves or rediscovers personal data;
- whether the public package can remain Raycast-only while MCP is distributed separately.

These are public-release constraints, not reasons to block a local personal release. They do mean that “public later” should be preserved through portable data/schema choices and an early Store-policy check.

### 11.3 Privacy posture

The agreed local-first scope avoids accounts, cloud sync, collaboration, analytics, and OS notifications. Store rules already prohibit external analytics. A credible public privacy description can therefore state that task content remains in a local database and is accessed only by the Raycast extension and explicitly configured local MCP process, subject to verifying that no dependency adds telemetry. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

## 12. Toolchain and verification expectations

**Source observation.** `@raycast/api` 2.0.5 requires Node `>=22.22.2` and uses React 19. The current API package, not older prose, is the authoritative dependency floor for a newly generated extension. [API 2.0.5 metadata](https://registry.npmjs.org/@raycast/api/2.0.5)

**Source observation.** Current `@raycast/utils` is compatible with recent API 1.x and React 19, but it is an optional utility package; its read-only SQLite helper does not determine the storage architecture. [Raycast Utils package metadata](https://registry.npmjs.org/@raycast/utils/latest), [executeSQL source](https://github.com/raycast/utils/blob/main/src/executeSQL.ts)

**Confirmed.** The official CLI provides development, build, lint, migration, and publishing commands. Store preparation requires build and lint to pass. [CLI documentation](https://developers.raycast.com/information/developer-tools/cli.md), [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

**Confirmed.** Development debugging is host-based: terminal logs, VS Code attachment, React DevTools, and Raycast’s production error reporting are the documented facilities. [debugging an extension](https://developers.raycast.com/basics/debug-an-extension.md)

**Verification constraint.** Database/domain behavior can have ordinary Node unit and integration tests, including two-process tests. Raycast rendering, root argument focus, menu-bar lifecycle, background scheduling, keyboard behavior, and deep links require a real Raycast v2 development build and manual smoke tests. Build/lint prove packaging and static validity, not interaction correctness. No current primary source documents a complete headless component-test harness for API 2.x.

## 13. Implications for this product

The research supports the following constraints and non-decisions:

1. **Raycast is the primary human application surface.** It can cover the agreed Today-first system and native menu-bar indicator without a separate macOS app.
2. **The task database, not the Raycast view, is the core product state.** Both Raycast commands and MCP need the same durable domain rules and stable IDs.
3. **API 2.x is the starting target.** Todoist’s interaction design is valuable, but its API 1.x package and cloud synchronization layer are not a template for the new foundation.
4. **Quick Add uses a compact Form.** It collects a required title plus optional Project, Due Date preset, and notes. The platform’s three-argument cap and static dropdown data should be treated as product constraints, not worked around with brittle encoding.
5. **Today must be one shared query definition.** Raycast lists, menu count, direct menu completion, and MCP reads must agree on overdue plus today, completion state, Trash exclusion, and timezone rules.
6. **Menu-bar freshness has two levels.** Mutations made inside Raycast can trigger a menu refresh; mutations made by MCP are only guaranteed to appear on later load/refresh until a supported bridge is proven.
7. **MCP is the agent interface.** A public CLI would duplicate surface and lifecycle without a current user requirement.
8. **Two-process SQLite correctness is a foundation risk.** Journal mode, timeouts, migrations, backup, and runtime versions are evidence questions, not defaults to inherit from a library.
9. **A native helper is deferred by evidence, not by inability.** Raycast already meets the menu-bar requirement; independence/custom UI would be a later product decision.
10. **Personal-first and public-later are compatible only if distribution assumptions remain reversible.** The data format, schema migrations, path discovery, and MCP packaging must not depend on an undocumented Store behavior.

This research does not choose a repository layout, package manager, SQLite wrapper, schema, command inventory, or milestone sequence.

## 14. Confirmed facts, inferences, and remaining unknowns

### Confirmed facts

- Raycast v2 is the current product and extensions remain React/TypeScript/Node. [v2 manual](https://manual.raycast.com/new-in-v2.md), [technical deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- `@raycast/api` 2.0.5 is npm `latest` as of the research date. [npm registry](https://registry.npmjs.org/@raycast/api)
- View, no-view, and real macOS menu-bar commands are supported. [schema](https://www.raycast.com/schemas/extension.json)
- Root arguments are capped at three and do not include a date picker or dynamic database-backed picker. [schema](https://www.raycast.com/schemas/extension.json)
- Menu actions, count titles, background refresh, and intra-Raycast background launch are supported. [Menu Bar API](https://developers.raycast.com/api-reference/menu-bar-commands.md), [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md), [command API](https://developers.raycast.com/api-reference/command.md)
- Local stdio MCP is supported by Codex. [Codex MCP](https://developers.openai.com/codex/mcp/)
- SQLite supports multiple readers but only one writer; WAL introduces version and backup obligations. [transactions](https://sqlite.org/lang_transaction.html), [WAL](https://www.sqlite.org/wal.html)

### Evidence-backed inferences

- A Raycast menu-bar command is sufficient for v1, so a separate native status app is unnecessary.
- `LocalStorage` is not a viable shared source of truth for MCP; a shared file database is.
- A no-view title capture plus a full Form is the best fit for the argument model.
- Dual-era MCP compatibility is safer than 2026-only mode for current Codex builds.
- Public MCP packaging and shared-data ownership should be validated before the internal packaging becomes fixed.

### Unknowns requiring direct validation

- The exact scaffold and runtime behavior produced by `@raycast/api` 2.0.5 on the installed v2 host.
- The exact Node and SQLite versions embedded in the installed Raycast build.
- Whether WAL is safe and beneficial across the Raycast and MCP runtimes used in practice.
- The stable shared database location across development, import, update, reinstall, and eventual Store install.
- The least-delayed supported way to refresh the menu after an external MCP mutation.
- The current Codex build’s negotiated MCP protocol without special environment flags.
- Store acceptance and distribution mechanics for a sibling MCP server.
- Behavior and performance of a large Today menu, including direct actions and system menu limits.
- Crash recovery during concurrent migration, write, backup, and Trash restoration.

## 15. Ranked validation spikes before planning

These are short evidence-gathering experiments, ranked by how much architectural uncertainty they remove. They are not an implementation sequence.

### 1. API 2.0.5 native scaffold and host contract — critical

Generate the current official scaffold without adding product code; inspect its package versions, TypeScript/React settings, manifest schema, CLI output, environment fields, and command behavior in the installed v2 host. Record the generated baseline, Node version, SQLite version, bundle targeting, and any differences from public prose. This resolves which parts of the documentation transition are real on the target machine. [current package](https://registry.npmjs.org/@raycast/api/2.0.5), [CLI](https://developers.raycast.com/information/developer-tools/cli.md)

### 2. Two-process SQLite contention and migration safety — critical

Use the exact Raycast runtime and intended MCP runtime to open the same temporary database. Exercise concurrent reads, simultaneous writes, busy handling, two starters racing a schema migration, forced termination during a transaction, foreign keys, and SQLite-aware backup. Compare rollback journal and WAL only after recording both SQLite patch versions. The output is evidence for journal mode, transaction policy, migration lock behavior, and runtime compatibility. [SQLite transactions](https://sqlite.org/lang_transaction.html), [WAL](https://www.sqlite.org/wal.html), [Node SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)

### 3. MCP dual-protocol Codex handshake — critical

Run the smallest official TypeScript SDK v2 stdio server against the installed Codex Desktop/CLI with default settings. Verify initialization, tool discovery, structured output plus text fallback, write approval behavior, stderr logging, cancellation, timeout, EOF shutdown, and restart. Repeat with explicit 2026 mode only to document the difference; retain legacy compatibility unless current Codex proves it unnecessary. [SDK package guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md), [SDK migration](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28), [Codex MCP](https://developers.openai.com/codex/mcp/)

### 4. Public distribution/path policy proof — critical for “public later”

Prepare a minimal, non-product packaging question for Raycast: acceptable delivery of a local stdio MCP server, stable shared Application Support ownership, external setup instructions, update/uninstall behavior, and binary/source-review expectations. In parallel, verify how local development/import paths change across reload and reinstall. This decides whether MCP can ship with the Store extension or needs a separately documented distribution. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store.md), [publishing](https://developers.raycast.com/basics/publish-an-extension.md)

### 5. External-write menu freshness — high

Render a count from a temporary shared database, then mutate it from a separate process while the menu is closed and open. Measure updates on menu open, ten-second background interval, Raycast restart/cached restoration, deep-link launch, and same-extension `launchCommand`. Establish the supported latency contract and whether any silent external wake-up exists. [Menu Bar lifecycle](https://developers.raycast.com/api-reference/menu-bar-commands.md), [background refresh](https://developers.raycast.com/information/lifecycle/background-refresh.md), [deep links](https://developers.raycast.com/information/lifecycle/deeplinks.md)

### 6. Quick Add interaction limits — resolved

The root-argument prototype confirmed the visible optional markers, three-argument limit, static dropdown data, and lack of a date picker. Quick Add now uses a compact Form with a required title, dynamic Project dropdown, optional Due Date presets, a conditional custom date picker, and optional notes. This resolves the argument contract without importing Todoist NLP. [arguments](https://developers.raycast.com/information/lifecycle/arguments.md), [Form](https://developers.raycast.com/api-reference/user-interface/form.md)

### 7. Today/date semantics across time zones — high

Create a small truth table for all-day dates, date-times, overdue boundaries, local midnight, DST transitions, system timezone changes, completion, and Trash. Run it from both Raycast and MCP runtimes. The spike establishes one shared meaning for the menu count and all Today views.

### 8. Menu-bar scale and interaction quality — medium

Measure menu rendering, grouping, keyboard behavior, direct completion, title truncation, loading state, and accessibility with empty, typical, and unusually large Today sets. Confirm where the menu should cap or link to the full Today view. [Menu Bar best practices](https://developers.raycast.com/api-reference/menu-bar-commands.md)

### 9. Data-location and lifecycle recovery — medium

Observe the candidate database directory through extension reload, Raycast update, local re-import, disabled extension, uninstall/reinstall, MCP start when Raycast is absent, and permissions failure. Ensure path discovery never silently forks the user’s task history. [environment paths](https://developers.raycast.com/api-reference/environment.md), [storage guidance](https://developers.raycast.com/api-reference/storage.md)

### 10. Backup, export, and destructive-state recovery — medium

Validate online backup or explicit export while both clients are active, restore into a fresh database, recover Trash, and handle an interrupted backup. This provides evidence for personal-data recoverability before a public promise is made. [Node SQLite backup](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html), [SQLite WAL](https://www.sqlite.org/wal.html)

## Research conclusion

The desired product is feasible as a Raycast-first local task system with a real Raycast-controlled macOS menu bar and a separate local MCP stdio process for agents. The current platform supports the interaction model and the official Todoist extension provides a strong UX reference. The modern baseline, however, is `@raycast/api` 2.x rather than Todoist’s API 1.x package, and official prose has not fully caught up.

The evidence argues for treating shared-data correctness and public packaging as the foundation questions. A native helper and a public CLI are not required by the agreed product. The remaining unknowns are narrow enough to resolve with the ranked validation spikes before any implementation plan or module structure is committed.
