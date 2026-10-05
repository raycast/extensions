# Kody's Pouch

The one Raycast command that makes Kody's Tools and Skills visible. The Pouch holds Tools and Skills. Selecting one pastes a Mention into the Active Input. Kody is the source of truth.

## Language

**Kody**:
The source of truth for the user's Skills, Tools, MCPs, secrets, and other durable assistant state.
_Avoid_: local config, editor settings, disk folders as source of truth

**Pouch**:
The user's inventory of Tools and Skills from Kody. The only Raycast command. Scope narrows to All, Skills, Tools, or one Parent. Search matches name, description, Parent, and a Skill's id. A successful pick pastes a Mention or Contents and closes. It does not read disk or write stubs.
_Avoid_: Commands list, Composer, launcher, stub, local SKILL.md

**Skill**:
A named, versioned instruction document stored in the Kody skills registry. Display name and id can differ. In the Pouch only when the skills package exists. Disk copies are stale. Grouped by Origin. Not a Tool and has no Parent.
_Avoid_: local SKILL.md as the canonical skill, tool, Author

**Origin**:
The inferred group for a Skill: the first kebab segment of its id, only when two or more Skills in the inventory share that segment. Skills that do not share a prefix sit in Other Skills. Not a Parent. Not the retriever `source` on skill-search (always "skills registry").
_Avoid_: source, author, Parent, skill-search source

**Tool**:
Anything Kody can call. Parent is a Package, Kody, an MCP server, or another connected provider.
_Avoid_: command, export, function, endpoint, skill

**Parent**:
Where a Tool lives: a Package, Kody, an MCP server, or another connected provider. A Skill is not a Tool and has no Parent.
_Avoid_: owner, source, namespace

**Package**:
A Kody package the user can browse and invoke. A Package is one kind of Parent.
_Avoid_: app, plugin

**Discovery Package**:
The Kody Package the Pouch calls through one inbound `pouch` webhook URL to load Tools, Skills, and Skill Contents. It exists for people who install the Pouch. It is a dedicated Package (`kody.id` `raycast-kodys-pouch`) published as a Community Listing. Installers fork that Listing, publish their copy, and mint their own credential URL. The webhook accepts only five explicit read-only Pouch operations, not arbitrary exports. Skills load through the owner's `skills` Package, usually a fork of Kent's skills Listing. The author's fork of Kent's `raycast` listing is hidden.
_Avoid_: official package, Kent's raycast, the fork as the product, `raycast` as this Package's id, shared host

**Community**:
The public catalog of published packages on this deployment.
_Avoid_: official catalog, live link to the author's copy

**Listing**:
A pinned snapshot of a published Package in Community. Not a live link to the author's private copy. Re-publishing updates the snapshot to the current published commit. A fork of a Listing is inert until the owner reviews and publishes it.
_Avoid_: live package, shared host, the author's running copy

**Scope**:
Which slice of the Pouch is visible: All, Skills, Tools, or one Parent that has Tools. Skills and Tools are always options. Search matches inside the current Scope. Opening the Pouch starts at All.
_Avoid_: Filter, Agent, category, a saved preference

**Recent**:
A pick that is not a Pin, shown in a Recent section when the query is empty. The section holds up to 5. Honors Scope. Unpinning restores the item here if it is still Recent. A pick is a successful Paste Mention or Paste Contents.
_Avoid_: favorite, history, selected item, last used, Copy Mention, Copy Contents

**Pin**:
A user-marked item that stays in a Pinned section above Recent until unpinned. At most 5 across the Pouch, not per Scope. Newest pin first. Pinning is not a pick.
_Avoid_: favorite, bookmark, star

**Mention**:
A one-line Pouch reference written by Paste Mention (or Copy Mention). Closing the Pouch writes nothing. Skill: `name skill — description (Load via Kody MCP execute only: \`import skillGet from 'kody:@<username>/<discoveryKodyId>/get-skill'\` (default export), then \`await skillGet({ id: <id> })\`. Read \`files\`, find path \`SKILL.md\`, follow its content.)`. The import path is the user's own Discovery Package fork, derived from the `username` and `discoveryKodyId` preferences, so each person's Mention resolves in their own Kody. Package Tool: `name tool (use Kody MCP to execute kodyId: <id> export: <export>)`. Built-in Tool: `name tool (use Kody MCP to execute <capability>)`. MCP Tool: `name tool (use Kody MCP to execute <server> <tool>)`. Other Tools: `name tool (use Kody MCP to execute <provider> <ref>)`. Not the Contents.
_Avoid_: stub, inline skill, bare name, `/name`, `$name`, multi-line mention, Prompt, Contents, hardcoded example ids, another owner's scope in the import path

**Contents**:
The Skill instruction document pasted into the Active Input instead of a Mention. Skills only. Tool rows have no Contents action. Shape: one lead-in line (`Follow this Skill:`), then a fenced block tagged `md title="{name}.md"` whose body is the full Skill markdown including YAML frontmatter. The outer fence uses at least four backticks, and one more than the longest backtick run inside the Skill so nested fences stay intact. `{name}` is the Skill display name.
_Avoid_: Mention, body, stub, inline skill, Tool payload, fixed three-backtick outer fence, Kody id in the title, bare SKILL.md title

**Active Input**:
The text field that had focus before Raycast opened. A pick pastes the Mention or Contents at the caret (or over the selection), like a normal paste. It does not replace the whole field.
_Avoid_: clipboard as the destination, Raycast search bar, replace-all

**Clipboard Fallback**:
Copy Mention and Copy Contents are the fallback actions when paste into the Active Input is not available. A pick always pastes via Raycast into the previously focused app. Clipboard is not the destination. Copy does not record a Recent.
_Avoid_: AppleScript focus checks, silent copy, fake paste
