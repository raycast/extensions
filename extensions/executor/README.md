# Executor for Raycast

Discover tools, fill in their inputs, review calls, and inspect results without leaving Raycast.
Independently maintained extension for [Executor](https://executor.sh), not an official Executor product.

## Commands

| Command             | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Manage Workspaces   | Add, verify, rename, and switch between Executor organizations                           |
| Search Tools        | Search by task or integration, inspect inputs, and run a tool                            |
| Browse Integrations | Browse configured integrations, edit metadata, and add a connection                      |
| Manage Connections  | Inspect health, browse connection-specific tools, reconnect, and edit labels             |
| Add Connection      | Choose an integration and scope, then add or authorize the connection                    |
| Add Integration     | Search the live catalog or configure a custom MCP, OpenAPI, or GraphQL endpoint          |
| Manage Policies     | Search, create, edit, and delete rules with exact pattern and scope review               |
| Review Approvals    | Reopen paused extension calls and review their current server terms                      |
| Executor Status     | Optional menu bar for recorded health, approvals, and shortcuts                          |
| Saved Tools         | Run favorites or load a saved input preset                                               |
| Browse Artifacts    | Open interactive artifacts, inspect details/source, copy links, edit details, and delete |

## Quick start

Open **Search Tools** to see **Welcome to Executor**, then choose **Add Workspace**. You can also configure a default workspace key in Extension Preferences.

1. Sign in to [Executor](https://executor.sh), choose the intended workspace, and open **API keys**.
2. Obtain a key for that workspace. In Raycast, open **Manage Workspaces**, then **Add Workspace**.
3. Enter a display name and the key. Leave Server URL blank for executor.sh; self-hosted users enter their server origin.
4. Choose **Add Workspace**, then open **Search Tools** or mention **@executor** in AI Chat.

If your workspace has no connected services yet, open **Add Integration**, choose a service, then select **Add Connection** after setup. Its tools become available once the connection is configured. Existing connected workspaces can go straight to **Search Tools**.

You need an Executor account or a compatible self-hosted server. The AI tools also require access to Raycast AI.
Ordinary extension commands do not require Raycast AI. Add one profile per Executor organization.

## Workspace settings

Open **Manage Workspaces**, then **Add Workspace**. Give the workspace a distinct name, enter its existing
API key and server URL, and choose whether to show personal connections, workspace connections, or both. Executor
verifies the key's console workspace before the profile is saved. Cloud API keys belong to one organization;
add a separate profile and key for each organization. There is no two-workspace limit.

Existing extension preferences appear as **Default Workspace**. Use **Verify Workspace** and **Edit Workspace**
to identify it without re-entering the key. It retains its existing favorites, presets, and approval references.
Profile keys use Raycast's encrypted LocalStorage, never the disk Cache API. The optional default preference key
continues to work; removing its profile requires clearing that preference first. Removing a profile does not revoke
the key or erase account-scoped presets and approval references. To replace a key, add a new profile, then remove
the old profile when no longer needed.

Press **Cmd-Shift-W** in a command's Actions menu to open the workspace picker. Switching updates the default
in place; **Open Workspace** (or **Cmd-O** on an inactive workspace) explicitly opens the originating command.
When opened directly, the picker opens Search Tools. Menu bar switching changes the default without opening a command. The workspace
is visible in navigation titles and call reviews. An already-open command retains its original workspace even if
the default changes elsewhere. Browser links resolve the key's actual workspace; verify the browser account
before finishing sign-in. Server URLs must be HTTPS origins, or local HTTP origins such as `http://127.0.0.1:4788`.

## Keyboard shortcuts

Actions use [Raycast's common shortcuts](https://developers.raycast.com/api-reference/keyboard) where available.
Shortcuts are shown in the Actions menu and apply to the current view or selected item.

| Shortcut     | Action                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- |
| Cmd-N        | Add an integration, connection, workspace, or policy; find a tool to save in Saved Tools |
| Cmd-Shift-N  | Add a connection to the selected integration in Browse Integrations                      |
| Cmd-E        | Edit details, workspace profiles, or saved tools                                         |
| Cmd-R        | Reload the current list, tool details, or recorded status                                |
| Cmd-Shift-R  | Resync the selected connection's tools                                                   |
| Cmd-S        | Save a favorite/preset, or export JSON from a result                                     |
| Cmd-O        | Open in Executor, or open the selected workspace                                         |
| Cmd-I        | View tool, integration, artifact, policy, or full-response details                       |
| Cmd-Shift-C  | Copy the primary address, identifier, link, pattern, or JSON                             |
| Cmd-Option-C | Copy the Executor CLI call from a tool                                                   |
| Ctrl-X       | Remove the selected saved item, policy, artifact, or local workspace profile             |
| Cmd-Shift-W  | Open the workspace picker                                                                |

Enter runs the primary action; Cmd-K opens Actions. Forms retain Cmd-Enter to submit and Tab/Shift-Tab to move
between fields. Creation shortcuts open forms or discovery; they do not submit changes. Existing review and
deletion confirmations still apply. Cmd-R rereads connection records; only Resync Tools contacts the resync API.

## Running tools

Open a tool and choose **Run Tool**. Simple schemas become native fields, with nested property names preserved
in the payload. Unsupported schemas use a JSON editor and an input-schema action. This fallback validates the
JSON object shape; Executor validates the complete tool schema. Optional text, numeric, and boolean fields use **Include in Request** checkboxes; their inputs appear when selected.
Clear the checkbox to omit the value, including when loading a preset. Optional choices offer **Not Set**. JSON previews, copies, and exports use two-space indentation; the raw input
editor also offers **Format JSON**.

**Review Tool Call** shows the exact tool address, owner, connection, and JSON inputs. Only **Run Tool** on
that screen sends the call. The extension never auto-approves policy gates and never automatically retries a
failed or uncertain call. Check the upstream system before manually submitting an uncertain operation again.

Paused calls can request approval, additional JSON input, or a browser step. Approve or continue only after
reviewing the returned terms and completing any required browser step. A pause can expire or be unavailable
on a hosted deployment; the extension reports that condition without rerunning the original call.

Results distinguish sandbox failures from upstream tool failures. Arrays of records get a compact table preview;
full JSON and text remain available to copy. **Export Result JSON** writes a file on this Mac and reveals it in Finder.
No result history is saved automatically.

## Saved tools and presets

**Save Tool** keeps a favorite without saving input values. **Save Input Preset** is an explicit action on the review
screen and stores the chosen inputs locally. Avoid saving secrets or sensitive records. Saved items are separated
by server, API key, and default owner. Changing any of those settings shows that configuration's saved items.

A preset is loaded into editable fields or JSON before review. Loading a preset never runs it.

## Raycast AI

Mention **@executor** in Raycast AI to discover and describe connected tools, call a tool with JSON arguments,
compose calls in Executor’s TypeScript sandbox, inspect connections, or retrieve saved artifacts.
AI instructions prefer code mode for multi-step work, batching discovery, schema inspection, and independent reads
to reduce model round trips. Standalone tools remain available for simple lookups.
The code-mode guide is bundled in `ai.yaml`, which Raycast supplies with the extension's tools.
It covers the sandbox calling conventions without an extra documentation call. This is the extension's
equivalent to Executor MCP's `skills` guidance, not a proxy for that MCP tool or a live skills feed.
The extension reads the live Executor catalog rather than maintaining a copied tool list. AI first lists configured
workspaces and carries the selected workspace ID through discovery, confirmation, execution, and continuation.
Read-only AI tools also accept unique aliases returned by list-workspaces, such as `personal` or `work`.
Execution, calls, and approvals require the stable ID so a renamed alias cannot redirect a confirmed operation.
With multiple profiles, ambiguous requests require a workspace choice. Only an explicit manage-workspace switch changes the command default.

Calls and code use Raycast’s native tool confirmation and retain Executor’s server policies. A paused run returns
its exact execution ID and terms. Continuation fetches those terms again and rejects a changed or unavailable
pause. The AI must show the request and wait for your decision; a browser step must be completed before continuing.
No failed or uncertain call is retried automatically.

AI can also edit integration display names and descriptions using **Update Integration Details**, the same
management API as the native editor. It requires a canonical workspace ID and shows the exact integration
and proposed changes in Raycast confirmation. Omitted fields remain unchanged; an empty description clears it.
This management request follows Executor API permissions, not sandbox tool-execution policies. It cannot
change integration slugs, credentials, connections, schemas, or policies.

This provides the Executor discovery/execution workflow through Raycast AI tools. It does not embed MCP Apps
inside Raycast; interactive artifacts open in Executor. Full live model behavior and confirmation handling require
manual QA in Raycast AI. The included example evals use synthetic data.

Try these prompts with your configured workspace name:

- **@executor List my workspaces**
- **@executor Find GitHub issue tools in Personal**
- **@executor In Personal, summarize tomorrow's calendar and up to 10 unread Gmail messages. Do not change anything.**

## Connection management

New connections and connections whose health was cleared by reauthorization appear as Unchecked until a health check completes. Manage Connections checks these once when they appear, with manual Check Health available for retries.

A confirmed expired health result or missing OAuth scopes makes reconnect the primary action. An old access-token
expiry alone does not, because the provider may refresh the token automatically.

Supported OAuth bindings can start their existing sign-in flow from Raycast. Existing dynamically registered
apps can rediscover and register through Executor before opening provider authorization, preserving the same
connection. Enterprise authentication, client metadata (CIMD), missing app bindings, and unsupported discovery
hand off to Executor's own account UI. Browser launch is not treated as successful
reconnection; return and check the connection afterward. Metadata editing changes labels and descriptions only.
Credential entry and provider configuration stay in Executor.

## Integration catalog

Provider logos use catalog domains or Executor’s display URL through its logo service, with no built-in provider-domain list. This includes OpenAPI integrations: Executor may supply an API base URL, saved provider domain, or specification URL. Missing metadata or unavailable images fall back to a neutral icon.

**Add Integration** searches the same public integrations.sh registry used by Executor, with provider logos,
pagination, and MCP/API/GraphQL filters. Provider names are public search queries. Pasted endpoint URLs are
handled separately and are not sent to that public search service. Selecting a provider opens native Raycast
setup with its endpoint, namespace, authentication metadata, and specification overrides preserved.
**Add Custom Integration** supports remote MCP and GraphQL endpoints or an OpenAPI URL or raw JSON/YAML.
Configuration is validated before a single creation request, then verified in the selected workspace.
Connect an account separately when authentication is required. OAuth consent and unsupported advanced
configuration may still use Executor or the provider in a browser.

AI can create the same supported integrations with **create-integration**, or open the native form with
**prepare-integration-setup**. Neither AI tool accepts account credentials.

## Policies and artifacts

**Manage Policies** shows readable tool names, integrations, Personal/Workspace scope, and compact policy status icons.
Confirmations label the Executor workspace separately from Personal or Workspace policy scope.
Scope and policy action labels follow Executor terminology; technical addresses remain available in details and copy actions.
Press Cmd-N to choose a specific tool, an integration, all tools, or an advanced custom pattern. Search tools by
name or task, or filter by integration; selecting one preserves its exact connection and address. No address
needs to be typed for a guided choice. The picker uses the available catalog and does not run tools.
The form shows the selected target, behavior and scope. Editing an existing policy keeps its target readable;
**Edit Tool Pattern** reveals the raw pattern when needed. Final confirmation still shows the exact rule.
Press Enter for a policy overview or Cmd-E to edit. **View Tool Pattern** exposes the full original address.
Creating or editing a rule reviews its exact scope and wildcard impact before saving. Executor owns ordering and
rule evaluation. The tool-specific action seeds a new exact rule while keeping all existing rules visible, including
broader wildcards. Deletion requires confirmation.

**Browse Artifacts** searches titles, descriptions, IDs, and scopes. Enter opens the interactive artifact in Executor;
Raycast shows native metadata and optional source inspection. Edit Artifact Details updates the title and description.
Delete requires confirmation. Interactive MCP app rendering stays in Executor’s browser interface.

## Status menu and approval inbox

**Executor Status** is an optional menu bar command, disabled by default. Enable it in Raycast’s extension settings
and run it to try the menu. It refreshes recorded connection status every 15 minutes and provides shortcuts to
common commands. Issues and approvals are grouped by configured workspace; selecting an item opens its own
workspace. General shortcuts use the selected default. It does not probe providers, reconnect accounts, run tools, or approve calls in the background.
Unknown or old health reports are identified separately from reported healthy connections.

**Review Approvals** contains only pauses observed by this extension. It stores an account-scoped execution
reference and timestamp, not tool inputs, approval terms, or results. Opening an entry retrieves its current terms
from Executor before displaying the normal explicit review actions. Resolved or unavailable runs are removed from
the local inbox. Approvals started in other MCP clients are not included.

## Development

```sh
npm ci --include=dev
bun test
npm run lint
npm run build
npm run dev
```

Use npm and the committed package-lock.json for dependency installation and Raycast Store CI. Bun is used only for the test suite.
The scoped minimatch override patches the ESLint parser dependency; remove it when the Raycast ESLint configuration resolves a patched version itself.

Types follow the published [Executor OpenAPI document](https://executor.sh/api/openapi.json).
Execution and OAuth behavior were checked against the public Executor source. Tests cover payload construction,
input typing, preset round trips, approval handling, request serialization, and connection routing. Native UI and
live sign-in/call acceptance are separate manual QA checks. AI entry points, confirmations, and examples follow
[Raycast’s AI extension guidance](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions) and
[extension best practices](https://developers.raycast.com/information/best-practices).

## Command and AI Capability Coverage

The extension exposes the same supported operations through native commands and AI tools. Browser sign-in and
credential entry remain secure user steps; agents can prepare those handoffs and verify completion.
Management tools use the same Executor APIs as their corresponding native actions. They are not sandbox tools.
Every AI write requires native confirmation and an exact canonical workspace ID; API permissions still apply.

| Native command/action                                   | AI equivalent                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Search tools, inspect schema/types, run/review calls    | discover-tools, describe-tool, call-tool, execute-code                                          |
| Inspect full execution response                         | includeFullResponse on call, code, preset, or resume tools                                      |
| Edit integration name/description                       | update-integration                                                                              |
| Delete an integration and its connections/tools         | delete-integration                                                                              |
| Delete one connection                                   | delete-connection                                                                               |
| Browse installed integrations                           | list-integrations                                                                               |
| Browse catalog, custom MCP/OpenAPI/GraphQL setup        | search-integration-catalog, create-integration, prepare-integration-setup                       |
| Browse connections and recorded health                  | list-connections, get-status                                                                    |
| Edit connection label/description                       | update-connection                                                                               |
| Fresh health check and resync                           | check-connection-health, resync-connection                                                      |
| Add/reconnect accounts                                  | add-connection opens native setup; reconnect-connection starts supported OAuth or browser setup |
| List, read, edit, delete artifacts                      | list-artifacts, get-artifact, rename-artifact, delete-artifact                                  |
| Read artifact source/bindings and open it               | get-artifact, open-executor-page                                                                |
| Save favorites and input presets                        | save-favorite, save-tool-preset                                                                 |
| Browse, inspect, edit, remove saved items               | list-saved-tools, get-saved-tool, update-saved-tool, remove-saved-tool                          |
| Run a saved preset                                      | execute-saved-preset                                                                            |
| List/search, create, edit, delete policies              | list-policies, manage-policy                                                                    |
| Review approvals, accept/decline/cancel, provide input  | list-approvals, get-approval, resume-execution                                                  |
| Status menu summary and refresh                         | get-status; fresh recorded status on each call                                                  |
| Add workspace or open credential preferences            | open-executor-view; private native forms                                                        |
| List, edit, verify, switch, remove local profiles       | list-workspaces, manage-workspace                                                               |
| Open native command or workspace console                | open-executor-view, open-executor-page                                                          |
| Copy addresses, identifiers, patterns, code, text, JSON | output-action with selected content from tool results                                           |
| Export result JSON                                      | output-action; private file, pretty-printed JSON                                                |

Policy update/delete and saved-item update/remove/execution require the fingerprint returned by their latest
read. A changed target stops the operation for fresh review. The checks do not make the remote API's writes
transactional. Do not use policy management to bypass a denial; request policy changes separately and explicitly.
Keep local profile and saved-item edits sequential. Do not retry uncertain writes; read current state first.

AI execution can inspect full response envelopes when explicitly requested. This does not add MCP Apps rendering
inside Raycast or historical retrieval of completed executions. Copies/exports use the selected response already
available to the agent; never rerun a mutation to obtain another format. UI/browser/model acceptance is manual QA.

Deleting a connection removes its tool access; deleting an integration also removes its connections and tools. Both use Ctrl-X in the Actions menu, show a confirmation, and honor Executor permissions. Protected integrations cannot be deleted. These operations cannot be undone and are never retried automatically.

Workspace checks identify the API key's organization for routing; they do not certify connection health. The workspace list shows only the active selection. Connection health reflects Executor's recorded result and check time.

### Native connection setup and metadata editing

Add Connection collects the integration, Personal/Workspace scope, authentication method, and optional label in Raycast. No-auth connections and declared API-key/header inputs are created through Executor's API. Password fields are kept only in the active form and sent directly to the configured Executor server, never to AI arguments, extension logs, saved presets, or Raycast drafts. Supported existing OAuth apps start through Executor and open the provider's authorization page; return to Raycast to check completion. Dynamic client registration, enterprise authorization, and authentication methods without sufficient metadata continue in Executor. A denied or failed native request does not trigger a browser fallback or automatic retry.

The add-connection AI tool opens that same native form with the exact workspace and method selected; opening it does not create the connection. Existing workspaces can edit their local name and connection filter. Preference-backed filters remain in Extension Preferences; changing a server or API key uses Add Workspace so the existing identity stays intact.

Edit Artifact Details supports title and description, including clearing the description. The backward-compatible rename-artifact AI tool accepts both fields. Title-only edits use the narrow rename endpoint. Description edits use Executor's artifact-save API and preserve current code, bindings, and preview. Stale native edits are rejected; agents may supply expectedUpdatedAt. Executor has no conditional metadata-update API, so a concurrent edit between the final read and save cannot be atomically prevented. A preview restore failure is reported separately after metadata is saved.

Saved Tools supports **Edit Saved Tool** (Cmd+E) for favorite names and preset names/inputs. Preset inputs are pretty-printed JSON; editing rechecks the saved item to avoid overwriting a detected stale version.

Add Connection uses one native form. Its primary action identifies the next step: **Add Connection**, **Authorize Connection**, or **Continue in Executor**. Unsupported authentication opens the exact browser setup directly; it does not repeat the form. A paused setup uses the existing approval review before continuing.
