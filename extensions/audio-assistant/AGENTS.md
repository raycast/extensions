# Audio Assistant implementation rules

Read `docs/DEVELOPMENT.md` and `docs/STATUS.md` before editing. These are the canonical product/architecture guide and implementation/validation record.

- Preserve settled product decisions and user fixes; implement bounded changes in separate commits so they can be reverted independently.
- Work inside WSL. From a Windows tool entry point, open `wsl.exe` and reuse the shell. Avoid PowerShell scripts. Linux workspace: `/mnt/c/Users/Opkelde/Projects/AudioAssistant`.
- Use Node >=22.22.2; `.nvmrc` pins the baseline. The existing local runtime can be activated with `export PATH="$PWD/.tools/node_modules/.bin:$PATH"`.
- Keep exactly seven top-level commands: Music, Play / Pause, Next Track, Previous Track, Volume Up, Volume Down, Toggle Mute. Their subtitles are Audio Assistant.
- Do not introduce menu-bar commands, AppleScript, shell-based playback, or a local audio receiver. Support Windows and macOS through Raycast's shared APIs.
- React consumes domain models through `MusicService`; server JSON decoding and commands belong in `src/services`. Never cast unvalidated server JSON straight into the domain types.
- Never silently choose a player. Highlight and active output are different; Enter sets and persists active output. Offline/stale selections must fail clearly.
- Resolve the active queue from server state, including grouping/source changes. Player IDs and queue IDs are not interchangeable by assumption.
- Preserve explicit demo labels and isolate demo behavior from the live adapter. Never report success for unimplemented actions.
- Store tokens only in the password preference; exclude them from logs, cache keys, URLs, fixtures, and documentation. Scope saved output to server and authenticated user; isolate demo state.
- Keep authoritative API source links and schema compatibility notes current. Verify against the user's running server before enabling version-sensitive grouping operations.
- No automatic retries for ambiguous playback or queue mutations. After timeout, refresh actual state first.
- Run `npm run check` and `npm run build` after substantive changes. Use meaningful domain/transport tests; native keyboard/layout checks are separate and must not be claimed from TypeScript success.
- Update `docs/STATUS.md` after completed implementation or validation work; keep product/architecture changes in `docs/DEVELOPMENT.md`. Do not create separate handoff or roadmap documents. Don't claim full cross-platform validation while required checks remain open.
