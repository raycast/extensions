# T3 Code Changelog

## [Threads from other machines] - 2026-11-23

- Waiting T3 Threads and Search T3 Threads also list threads from the servers in the new `Additional Servers` preference, one `<origin> <token>` pair per entry. Each thread shows its machine, and opening it uses that machine's environment ID.
- A server that does not answer is reported in a toast while the others still show.
- Requests to a server stop after 15 seconds, so a machine that is asleep or offline no longer leaves a command loading forever.
- The access token may go over plain HTTP to Tailscale MagicDNS names (`*.ts.net`), which Tailscale encrypts, as well as to loopback.

## [Fix opening threads on recent T3 Code versions] - 2026-11-11

- Open threads by environment and thread ID on supported desktops, avoiding failed title and branch searches and non-ASCII keystroke input.
- Keep command-palette navigation for older desktops and servers without an environment ID.

## [Prompt T3 Code on protocol v2, files, presets and providers] - 2026-10-17

- Prompt T3 Code works on protocol v2 servers. It creates the thread, the worktree and the first message over the WebSocket, and still uses HTTP on v1.
- Attach files to a prompt: any file type, up to 8, with images up to 10 MB and other files up to 50 MB. A screenshot on the clipboard is attached when the command opens, and `⌘⇧V` attaches one copied later. `⌘⇧A` attaches the files selected in Finder, and `⌘Y` previews what is attached.
- One Preset dropdown replaces Project, Model, Permissions and Workspace. It lists starred presets, then the combinations you used recently. Custom… shows the separate fields again. `⌘D` stars the current settings.
- Models are listed for every enabled provider instance, including custom ones such as a second Claude. Each shows its provider, effort and context window, and models that differ only by a no-op option are listed once. Models starred in T3 Code show as favorites.
- `⌘⇧↵` sends the prompt without opening T3 Code.

## [Protocol v2 support] - 2026-10-08

- Waiting T3 Threads and Search T3 Threads work with T3 Code servers on orchestration protocol v2 as well as v1.
- The T3 Code app name is detected from the running server, so both the stable (T3 Code (Alpha)) and Nightly builds open and focus correctly. The `App Name` preference is now an optional override.
- Prompt T3 Code reports that it is not supported yet on protocol v2, where threads can only be created over WebSocket.

## [Initial Version] - 2026-10-01

- Prompt T3 Code: start a session with a prompt, choosing project, model, permissions and workspace.
- Waiting T3 Threads: active threads whose agent has stopped.
- Search T3 Threads: every live thread, by title, project or branch.
