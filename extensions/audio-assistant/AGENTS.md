# Audio Assistant implementation rules

Read `docs/HANDOFF.md`, `docs/PRODUCT_SPEC.md`, and the first incomplete milestone in `docs/IMPLEMENTATION_PLAN.md` before editing.

- This is the user's foundation for another model to finish. Preserve settled product decisions; implement one bounded milestone at a time.
- Work inside WSL. From a Windows tool entry point, open `wsl.exe` and reuse the shell. Avoid PowerShell scripts. Linux workspace: `/mnt/c/Users/Opkelde/Projects/AudioAssistant`.
- Use Node >=22.22.2; `.nvmrc` pins the baseline. The existing local runtime can be activated with `export PATH="$PWD/.tools/node_modules/.bin:$PATH"`.
- Keep exactly four top-level commands: Music, Play/Pause, Next Track, Previous Track. Their subtitles are Audio Assistant.
- Do not introduce menu-bar commands, AppleScript, shell-based playback, or a local audio receiver. Support Windows and macOS through Raycast's shared APIs.
- React consumes domain models through `MusicService`; server JSON decoding and commands belong in `src/services`. Never cast unvalidated server JSON straight into the domain types.
- Never silently choose a player. Highlight and active output are different; Enter sets and persists active output. Offline/stale selections must fail clearly.
- Resolve the active queue from server state, including grouping/source changes. Player IDs and queue IDs are not interchangeable by assumption.
- Preserve explicit demo labels and failure behavior until live integration exists. Never report success for unimplemented actions.
- Store tokens only in the password preference; exclude them from logs, cache keys, URLs, fixtures, and documentation. Scope saved output to server and authenticated user; isolate demo state.
- Keep authoritative API source links and schema compatibility notes current. Verify against the user's running server before enabling version-sensitive grouping operations.
- No automatic retries for ambiguous playback or queue mutations. After timeout, refresh actual state first.
- Run `npm run check` and `npm run build` after substantive changes. Use meaningful domain/transport tests; native keyboard/layout checks are separate and must not be claimed from TypeScript success.
- Update milestone status and validation evidence after each completed slice. Don't call the extension release-ready while `docs/VALIDATION.md` has required unchecked items.
