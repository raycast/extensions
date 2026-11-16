---
name: json-canvas
description: Draft or revise Obsidian Canvas documents as JSON. Use for .canvas files, mind maps, flowcharts, and diagrams built from nodes and edges.
---

# JSON Canvas

1. Translate the requested content into nodes and connections. If the canvas refers to vault notes, use `getVaults` and `searchNote` to resolve their paths and use paths relative to the selected vault in file nodes.
2. Make a JSON object with `nodes` and `edges` arrays. Give each node a unique `id`, a `type`, and integer `x`, `y`, `width`, and `height`. Use positive dimensions and enough space to read the labels.
3. Use `text` for a Markdown text node, `file` for a vault file, `url` for a link node, and `label` for a named group. Give each edge a unique `id` and valid `fromNode` and `toNode` IDs. Set anchor sides or edge labels where they help explain the relationship.
4. When revising supplied JSON, preserve unrelated nodes, edges, IDs, and properties. Check the JSON syntax, unique IDs, and edge endpoints. Return the JSON with a suggested `.canvas` filename.

See the [JSON Canvas specification](https://jsoncanvas.org/spec/1.0/).
