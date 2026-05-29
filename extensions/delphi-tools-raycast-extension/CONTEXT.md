# delphitools Raycast Extension

This context names the product language for a Raycast extension that brings delphitools into Raycast. It keeps the extension aligned with delphitools' small-tool, local-first, privacy-respecting ethos.

## Language

**delphitools**:
A local CLI-backed collection of small, low-stakes utilities surfaced through Raycast. delphitools is the execution engine for the extension.
_Avoid_: delphi-tools, Delphi CLI, CLI replacement

**Delphi**:
The tool suite and product context behind delphitools. It does not mean the Delphi programming language or unrelated Delphi tooling.
_Avoid_: Delphi language, Embarcadero Delphi

**Tool**:
One focused utility from the delphitools catalogue. A Tool belongs to delphitools and may be exposed as its own Raycast command.
_Avoid_: App, feature, website page

**CLI Manifest**:
A machine-readable description of available Tools and their input/output shape. The Raycast Extension uses it as the source of truth for per-tool commands.
_Avoid_: Website scrape, web API, hard-coded catalogue

**Action**:
A small Raycast function available inside an Action Panel for the current command context. Actions control or transform the selected item, such as copying a link, assigning a label, or triggering another focused operation.
_Avoid_: Command, Tool

**Action Panel**:
The Raycast surface that lists the Actions available for the current command context. It is opened with Command-K and is used to discover and run contextual Actions.
_Avoid_: Menu, command palette

**Command**:
A Raycast Extension entry point that appears in Raycast root search. Commands can be scripts, lists, forms, or richer Raycast UI flows.
_Avoid_: Action, Raycast Tool

**Extension**:
A Raycast package that adds functionality to Raycast. An Extension contains one or more Commands and can be installed from the Raycast Store.
_Avoid_: App, plugin, script

**Extension Preference**:
A user-configurable setting that applies across Commands in the Raycast Extension unless a Command has a more specific reason to override it.
_Avoid_: Global setting, config flag

**Manifest**:
The package.json file for a Raycast Extension. It is an npm package manifest plus Raycast-specific metadata used to identify and publish the Extension.
_Avoid_: CLI Manifest, config file

**Raycast Tool**:
A Raycast Extension entry point that is only available to Raycast AI. Raycast Tools do not appear in root search and users do not interact with them directly.
_Avoid_: Command, Action, delphitools Tool

## Flagged Ambiguities

**delphi-tools**:
Use only for repository, package, or generated command naming. In product language, use **delphitools**.

**Wrapper**:
Use **Raycast Extension** when referring to the user-facing Raycast layer. The extension wraps local CLI execution, not the delphitools website.

**Tool**:
The existing glossary uses **Tool** for a delphitools utility. Use **Raycast Tool** when referring to Raycast's callable extension entry point.
