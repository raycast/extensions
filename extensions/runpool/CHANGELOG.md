# RunPool Changelog

## [Unreleased]

- Show persistent per-pool pause state separately from the global pause
- Add guarded Pause Pool and Resume Pool actions and AI tools
- Prevent Start Pool from bypassing a persistent or global pause
- Answer a missing or signed-out GitHub CLI with a screen and the command that fixes it, and say so on the pool list when runner registrations are going unchecked as a result
- Replace the fixed capacity actions with one step either way plus Set Runner Count, so a pool registered above the old range can be restored
- Refuse to resize a pool with jobs in flight before asking to confirm, rather than after
- Abandon a resize, rather than write it, if the pool was changed elsewhere while the confirmation was open
- Hand the expected count to runpool, so a resize is refused by the tool itself rather than only by this extension
- Note when GitHub holds more runner registrations for a repository pool than the pool expects
- Offer a way back from the dependency screens, so correcting the executable path in preferences takes effect without relaunching the command
- Stop the Get Pool Status AI tool reporting a pool as resting when GitHub could not be asked whether it is still registered
- Remove the Machine Load command

## [Initial Version] - 2026-09-01

- List every runner pool against its owner's GitHub avatar, showing jobs running out of total runner slots
- Start and stop pools, and change how many runners each has
- Drill into a pool to see the repositories it serves, and open them on GitHub
- Browse recent workflow runs with when they ran and a compact runner summary, then drill into individual job duration and location
- Pause and resume runner pools, behind a confirmation
- A live summary in the root search subtitle, refreshed in the background
- An optional menu bar item, off by default, whose icon fills with the work in flight
- AI tools for reading pool state and changing capacity, with confirmation before anything destructive
