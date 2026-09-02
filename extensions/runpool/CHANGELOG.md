# RunPool Changelog

## [Fix a resize that could act on the wrong count] - 2026-09-02

- Record every size a resize confirmation was shown, so two questions open at once cannot swap starting counts and turn approved growth into a shrink
- Refuse the change when those questions disagree about the pool's size, or when a shrink cannot be tied to a confirmation at all

## [Initial Version] - 2026-09-01

- List every runner pool against its owner's GitHub avatar, showing jobs running out of total runner slots
- Start, stop, pause and resume pools, one at a time or globally, with a confirmation before anything destructive
- Change how many runners a pool has, a step at a time or set directly, and refuse the change if the count moved since it was confirmed
- Drill into a pool to see the repositories it serves, and open them on GitHub
- Browse recent workflow runs with when they ran and a compact runner summary, then drill into individual job duration and location
- A live summary in the root search subtitle, plus an optional menu bar item, off by default, whose icon fills with the work in flight
- AI tools for reading pool state and changing capacity, behind the same confirmations
- Say when the GitHub CLI is missing or signed out, with the command that fixes it, and when GitHub holds more runner registrations than a pool expects
