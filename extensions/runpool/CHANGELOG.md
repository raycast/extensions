# RunPool Changelog

## [Unreleased]

- Show persistent per-pool pause state separately from the global pause
- Add guarded Pause Pool and Resume Pool actions and AI tools
- Prevent Start Pool from bypassing a persistent or global pause

## [Initial Version] - {PR_MERGE_DATE}

- List every runner pool against its owner's GitHub avatar, showing jobs running out of total runner slots
- Start and stop pools, and change how many runners each has
- Drill into a pool to see the repositories it serves, and open them on GitHub
- Browse recent workflow runs with when they ran and a compact runner summary, then drill into individual job duration and location
- Pause and resume runner pools, behind a confirmation
- A live summary in the root search subtitle, refreshed in the background
- An optional menu bar item, off by default, whose icon fills with the work in flight
- An optional machine load readout, off by default
- AI tools for reading pool state and changing capacity, with confirmation before anything destructive
