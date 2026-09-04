# Dock badges as the unread signal

Read Me Maybe derives every Source's Unread Count from its user-visible Dock Badge rather than application APIs, notification databases, or source-specific app integrations. This gives the fixed initial Sources a consistent, privacy-limited, generalizable signal, at the accepted cost that Attention Badges and threshold badges cannot represent an exact message count.

## Considered Options

- Application APIs or AppleScript integrations could give more exact, source-specific message counts, but add separate permission, privacy, and maintenance boundaries.
- Notification databases could provide data unavailable in a Dock Badge, but would not represent each app's intended user-visible attention state.
