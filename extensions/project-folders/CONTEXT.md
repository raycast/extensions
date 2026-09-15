# Context - Project Folders

A Raycast extension for browsing creative **Project** folders and jumping to their
linked tools (Asana, Google Drive, Frame.io, Magic Link Machine).

## Glossary

### Project
A single creative job, stored on disk as a folder at `<projectsRoot>/<YYYY>/<MMDD_Name>/`.
Identified internally by `year` + `name`. May carry links to external tools.

### gid
The Asana **task** identifier for a Project, extracted from the Project's `Asana.html`
shortcut. Globally unique and stable across folder renames. It is the canonical cross-tool
key: Asana, Magic Link Machine, and external scripts all reference a Project by its gid.
A Project without an `Asana.html` has no gid and therefore cannot be referenced by gid.

### Deeplink
A `raycast://` URL that opens a specific command in this extension. We use deeplinks
carrying a Project's gid so external tools (e.g. an After Effects script) can open that
Project directly in its grid view. See the deeplink contract in the relevant ADR.

### Grid view (Project screen)
The per-Project screen showing tiles for each tool link and each subfolder. This is the
landing surface a gid deeplink navigates to.
