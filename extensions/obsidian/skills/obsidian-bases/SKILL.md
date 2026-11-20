---
name: obsidian-bases
description: Draft Obsidian Bases YAML for filtered views of vault notes. Use for .base files, tables or cards based on note properties, formulas, or filters.
---

# Obsidian Bases

1. Identify which notes belong in the Base, which properties each view should display, and how to sort or group them. If the user wants to build a Base around existing notes, use `getVaults`, `searchNote`, and `readNote` to check representative Markdown properties.
2. Use top-level `filters` for criteria shared by all views and view-level `filters` for criteria specific to one view. Use `file.*` for built-in file properties, note property names for frontmatter, and `formula.*` for declared formulas.
3. If the user supplies an existing Base, preserve its other views, filters, and formulas. Check YAML indentation and quoting, and check that every formula referenced by a view is defined.
4. Return the YAML and a suggested `.base` filename. For an inline Base, use a fenced `base` block in an Obsidian Markdown note.

```yaml
filters: 'file.hasTag("project")'
views:
  - type: table
    name: Projects
    order:
      - file.name
      - status
```

See [Bases syntax](https://help.obsidian.md/bases/syntax) and [functions](https://help.obsidian.md/bases/functions).
