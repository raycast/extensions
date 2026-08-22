# CLI Client

`createGroundcrewClient` is the typed, shell-free boundary to an installed Groundcrew CLI. It resolves and verifies the
executable once, then exposes only task listing/lookup, the full legacy status inventory, and task lifecycle methods.

Lifecycle results describe only the child process terminal state and opaque diagnostics. After any lifecycle result,
callers decide when to refresh both task data and the full status inventory; the client never infers an outcome from
human stdout or stderr.

The client does not read Groundcrew configuration or provider credentials.
