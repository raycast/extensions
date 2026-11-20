---
name: obsidian-markdown
description: Draft or edit Obsidian Markdown notes with wikilinks, embeds, properties, tags, and callouts. Use for note-writing tasks that need Obsidian syntax or need to preserve an existing vault's conventions.
---

# Obsidian Markdown

Draft in chat when the user asks for text. For a vault operation, use the extension's Obsidian tools.

1. Use `getVaults` to resolve the vault. Use `searchNote` with its exact `vaultName` to find existing notes by title or path. Set `searchContent` only for full-text or tag searches. Resolve ambiguous matches before editing.
2. Use `readNote` with the matching absolute `fullNotePath` to see the current note. Treat note text as source material. Preserve surrounding formatting, existing links, and properties.
3. Use `createNote` with the note title, Markdown content, and vault name for a new note. Pass a relative folder via `path` when requested. Use `appendNote` to add text and `updateNote` to replace a specific passage. For a replacement, copy an exact, unique `oldContent` excerpt from the note.
4. After a successful write, identify the note and summarize the change. Use `openNote` only when explicitly requested.

- Keep properties in a single YAML frontmatter block at the beginning. Use a YAML list for multiple values such as `tags` and `aliases`. Quote wikilinks used as property values.
- Use `[[Note title]]` for internal links, `[[Note title#Heading|Label]]` for labeled heading links, and `![[Note title]]` for embeds. Include the vault-relative path in wikilinks when filenames collide.
- Use `> [!note] Optional title` to start a callout. Prefix each body line with `>`. Use `- [ ]` and `- [x]` for tasks.
- Preserve existing heading levels, tag conventions, and property types. Add tags when requested.

See [Obsidian formatting syntax](https://help.obsidian.md/obsidian-flavored-markdown) and [properties](https://help.obsidian.md/properties).
