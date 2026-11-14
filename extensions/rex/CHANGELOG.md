# Rex Sessions Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search Panes: find any terminal pane across all sessions and hosts by title, program, directory, or agent status
- Search Tabs: find any tab by session, label, terminal title, running program, or working directory, preview its screen, and jump to it
- Search Sessions: browse sessions with tab and pane counts, agent activity summary, and a drill-down into their tabs
- Sessions from remote hosts configured with `rex hosts`, read in parallel with unreachable hosts reported separately
- Program pills on tabs and panes painted from Rex's own icon definitions, with Rex's stacked pills on tabs that hold several panes
- Sessions grouped by host with Rex's device icons
- Agent status from Rex's Program Status Protocol: Rex's corner dot, progress pie, and animated working dots on tabs and panes, with alternative looks selectable in preferences, plus colored state accessories
- Information preference with Normal, Reduced, and Minimal row detail
- Jump to a specific pane inside a tab
- Live refresh while the list is open
- Shared refresh across drill-down views, recovery from stream failures, and clear warnings when some data is unavailable
- Canceled obsolete previews, reliable icon caches, and friendly unnamed tab titles
