# Investigation: supporting Windows-native (PowerShell / cmd) Claude Code

**Question:** Can this extension also surface Claude Code sessions/projects that were
run natively on Windows (PowerShell / cmd), not only those run inside WSL?

**Answer:** Yes. The data is present and uses the same schema; the work is in *reading a
second store* and *launching in the right shell per session*. Findings and a design below.

## What exists today

The extension hardwires `isWindows ⇒ WSL backend` (`src/lib/platform.ts`):
- reads `\\wsl.localhost\<distro>\home\<user>\.claude`
- assumes session `cwd` is a Linux path
- launches via `wt + wsl + <login-shell> -lic`

## What we found on this machine (both backends are present)

| | WSL claude | Windows-native claude |
|---|---|---|
| Store | `\\wsl.localhost\Ubuntu\home\user\.claude` | `C:\Users\user\.claude` (= `os.homedir()\.claude` when Raycast runs on Windows) |
| `projects/` dir name | `-home-user-repos-foo` | `C--Users-user-dev-foo` (drive `:` and every `\` → `-`) |
| Session `cwd` (in JSONL) | `/home/user/repos/foo` | `C:\Users\user\dev\foo` (backslashes) |
| JSONL schema | same | same — `ai-title`, `last-prompt`, user/assistant all present, so the recall parser works unchanged |
| Binary | `claude` on PATH in the WSL login shell | `C:\Users\user\.local\bin\claude.exe` (PE32+), on PATH as `claude` |

So a single Windows user can have **both** stores at once (this machine does: the
`raycast-claude-code-resume` repo appears in WSL as `/home/user/repos/...` and natively as
`C:\Users\user\dev\...` — genuinely different working copies, keep them separate).

## Design to support it

Introduce a `backend` concept instead of the binary `isWindows` switch.

1. **Stores.** `claudeHome()` becomes "list of roots", each tagged:
   - `windows`: `path.join(os.homedir(), ".claude")` — trivial, since on Windows
     `os.homedir()` is already `C:\Users\<user>`.
   - `wsl`: the existing UNC path (one per configured distro).
   - mac/Linux: the single native `~/.claude` (unchanged).
   Read every enabled root, tag each `Session` with its backend, merge, sort by mtime.

2. **Launch dispatch.** `launchInteractive(cwd, extra, backend)`:
   - `wsl` → existing path.
   - `windows` → open PowerShell (or cmd) in a new Windows Terminal tab, e.g.
     `wt -w 0 pwsh -NoExit -Command "Set-Location -LiteralPath '<cwd>'; claude <args>"`.
     `-NoExit` keeps the window open (the WSL path uses `exec <shell>` for the same reason).
   - The backend is known from which store the session was read, so no cwd guessing is
     needed; `cwd` shape (`^[A-Za-z]:[\\/]` vs `^/`) is only a sanity check.

3. **Quoting.** POSIX `shArg()` (single-quote + `'\''`) is wrong for PowerShell. Add a
   `psArg()` that single-quotes and doubles embedded single quotes (`'' `). `buildCommand()`
   (the copy fallback) must emit a PowerShell/cmd command for `windows` sessions.

4. **`decodeProjectDir`** for the `windows` naming (`C--Users-...`) is ambiguous (a real
   `-` in a path is indistinguishable from a separator), but it is only a fallback for when
   no `cwd` is found in the JSONL — low priority.

5. **Preferences / Setup.** Add toggles: "Include WSL sessions", "Include Windows sessions",
   a Windows shell choice (`pwsh` / `powershell` / `cmd`), and an optional native claude path.
   The `setup` command should validate each enabled backend.

## Effort / risk

- **Moderate, mostly mechanical.** The heart is turning one root + one launcher into a small
  list keyed by backend; the recall/list/setup UI is backend-agnostic already.
- **Risks:** PowerShell quoting/`-NoExit` correctness; deciding default-on vs opt-in for each
  store (auto-detecting both and merging is the nicest UX); keeping CLAUDE.md's "flat-rate /
  interactive only" rule (native launch must still be plain interactive `claude`, never `-p`).
- **No new binaries** required (CLAUDE.md constraint holds): `wt`/`pwsh`/`claude.exe` already
  ship with the Windows environment we target.

## Recommendation

Feasible and worth doing. Suggested first slice: read the `windows` store and show its
sessions read-only (recall works immediately), then add the PowerShell launch + quoting,
then preferences/Setup wiring.
