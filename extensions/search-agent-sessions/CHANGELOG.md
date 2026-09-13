# Agent Session Search Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Full-text search across Claude Code and Codex CLI transcripts, ranked by how tightly a session matches, with the matched words marked
- Resume a session in Terminal, iTerm, Ghostty, WezTerm, Kitty, Alacritty or Orca, or reattach to the Orca pane already running it rather than starting a second
- Transcript pane showing the messages around the match, with pasted screenshots rendered inline
- Open the files a transcript names, in the app of your choice
- Filter by agent or project from the dropdown, or with `dir:` and `agent:` in the query
- Searches on system `grep` out of the box, with a one-click install of a checksum-verified ripgrep for a roughly fortyfold speedup
