---
description: An explanation of various terms used in this documentation.
---

# Terminology

## Action

Actions are accessible via the [Action Panel](terminology.md#action-panel) in a [command](terminology.md#command). They are little functionality to control something; for example, to add a label to the selected GitHub issue, copy the link to a Linear issue, or anything else. Actions can have assigned keyboard shortcuts.

## Action Panel

Action Panel is located on the bottom right and can be opened with `⌘` `K`. It contains all currently available [actions](terminology.md#action) and makes them easily discoverable.

## Command

Commands are available in the root search of Raycast. They can be a simple script or lists, forms, and more complex UI.

## Extension

Extensions add functionality to Raycast. They consist of one or many [commands](terminology.md#command) and can be installed from the Store.

## Manifest

Manifest is the `package.json` file of an [extension](terminology.md#extension). It's an npm package mixed with Raycast specific metadata. The latter is necessary to identify the package for Raycast and publish it to the Store.
