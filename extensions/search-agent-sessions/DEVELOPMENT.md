# Development

Design notes for anyone working on this extension. The user-facing description is in [README.md](README.md).

## How it works

The raw transcripts are too big to search per keystroke: 3.2GB of `~/.claude/projects/**/*.jsonl` plus 711MB of `~/.codex/sessions/**/*.jsonl`, which `rg` takes ~550ms to sweep. User and assistant text is only ~1.7% of those bytes, so the command derives a flat text corpus in the extension's Raycast support directory (`sessionKey \t seq \t text` per line, plus a `sessions.json` manifest) and searches that instead. That directory arrives by injection — `src/search-agent-sessions.tsx` calls `setSupportPath` at module scope — because nothing under `src/lib` may import `@raycast/api` without taking the whole library out of the unit suite's reach. `paths.ts` therefore exposes `corpusPath()` and friends as functions rather than constants, so none of them can read the default before the command has replaced it. Messages over 1400 characters are split across several lines with overlap, all sharing one `seq`, so a line is snippet-sized rather than strictly one per message.

The corpus and the manifest are two files, so the order they are written in is what makes a killed refresh recoverable: lines are appended first, the manifest saved after, recording in `bytes` how long the corpus was when the offsets beside it were taken. A later run finding a longer corpus truncates back to `bytes`, because the excess is the tail of an interrupted pass and the sessions that produced it emit it again; leaving it would have every query rescanning a duplicate range. A shorter corpus has lost indexed content, which only a rebuild repairs, and a rebuild saves its empty manifest before clearing the corpus, so a kill mid-rebuild lands the next run in a rebuild too.

Measured here on a quiet machine: a full cold re-index is ~2.8s for the 2.5GB it actually reads, producing 68MB; an incremental refresh is ~10ms; and a three-word query plus `dir:` reaches its first row after ~19ms of index work. The last two are the indexing and search path only, measured in plain Node — neither includes React rendering or the Raycast bridge, so what you see on screen is slower.

## What sweeps the corpus

`chooseBackend` in `src/lib/search.ts` picks between three binaries, fastest first with a floor: the copy this extension installed, then a ripgrep already on the machine, then `/usr/bin/grep`. The floor is why the store listing declares no dependency to go and install — Raycast's guidelines rule out asking a user to fetch a binary by hand, and grep makes that unnecessary rather than merely apologised for. It costs about forty times the wall clock on a corpus this size (~580ms against ~15ms for a three-word chain over 69MB), which the partial pass's existing budget absorbs by truncating.

The two flag sets are not translations of each other so much as the same four demands spelled twice: fixed strings, case-insensitive, binary-blind, quiet. `-N` and `--no-config` have no BSD counterpart because BSD grep volunteers neither. What makes one process-handling path serve both is that their exit codes agree — 0 matched, 1 matched nothing, 2 and up a real failure.

`installRipgrep` in `src/lib/ripgrep.ts` fetches a pinned release, and both the version and the per-arch SHA-256 digests are written out in the source. Fetching the digest alongside the archive would prove only that the server agrees with itself; hard-coding it means the bytes are checked against something a store reviewer read, which is the entire basis on which Raycast permits an extension to download an executable. Bumping the version means replacing all three values together, from the `.sha256` files published beside each asset.

The install is ordered so that no failure can leave a half-installed binary behind: the archive is held in memory and verified before `tar` is allowed near it, extraction lands on a temporary name, and the file is renamed into place only after it has been run once and seen to identify itself as ripgrep. That last step is not ceremony — it is what catches an arch mismatch or a Gatekeeper refusal while the previously working backend is still in place.

## Marking the match

The query is a set of words, and marking each one wherever it lands buries the hit: a query of `what the` underlines the `the` inside every `then` on screen while the sentence the user half-remembered sits there whole. So `marksFor` in `src/lib/highlight.ts` looks for the whole query as a phrase first — its words in order, across any whitespace, since the indexer collapses whitespace before the sweep matches — and marks the phrase alone when the pane holds one. The decision is pane-wide rather than per message, because one message showing the phrase makes word marks in its neighbours noise about the same hit.

The pane is built in two steps for what they cost rather than what they do. `renderPane` embeds images and demotes headings, which probes the filesystem once per image marker; `paneMarkdown` marks the query and joins. Only the query moves while the user types, and the messages behind it are identity-stable, so the command caches the first step and re-runs the second — which keeps a keystroke flat at a fraction of a millisecond however many screenshots the window holds, and keeps every syscall out of a React render.

Two rules keep that suppression honest, and both were bugs before they were rules. A phrase may not span a blank line: heading demotion manufactures paragraph breaks, and two words either side of one are not a phrase anyone sees. And the phrase is looked for in `visible(text)` — the message with link targets, reference definitions and tag-shaped spans removed, which is what markdown consumes rather than renders. Finding a phrase in text nobody sees suppressed every mark on the pane, which is strictly worse than the noise the rule exists to avoid. Code is deliberately not removed: `highlight` cannot mark inside a fence, but a fence shows the query as plainly as a paragraph does, so a phrase there still earns the quiet. That exemption is why `visible` runs through `mapProse`, the one place that knows where code begins and ends. Removed regions leave a blank line behind rather than closing up, so the halves either side of an image cannot butt together into a phrase nobody wrote.

## Files in the detail pane

Tab peeks at the transcript, and a pasted-image marker in it becomes the image itself. Markers quoted inside code are left as written, and one whose paste has since been swept stays as the sentence wrote it rather than becoming a broken image.

Paths are not linked, because a markdown link in `List.Item.Detail` is only actionable for `http(s)`. A `file://` URL or a `raycast://` deeplink renders, styles as a link, and does nothing whatever when clicked, with no error anywhere to say why — so a linked path would be a lie about what the pane can do. Opening a file is an ActionPanel action instead: `⌘⇧O` lists the files the visible transcript names, and opens the chosen one. The action appears only when there is something to list, which is not most of the time — a screen of design talk names no files at all.

The list comes from `findPaths` in `src/lib/links.ts`, which resolves the paths a message names, reading code as readily as prose, against the session's directory and two levels beneath it. Directories, relative paths without an extension, and paths cut short by truncation are all left out, as is a path matching more than one place, since naming the wrong file is worse than naming none.

## Opening files

`resolveEditor` in `src/lib/editor.ts` turns the "Open Files With" preference into one of three routes. Orca is not an `open` target at all, taking a file through its CLI and only inside a worktree. System Default names no app either, but wants the opposite fallback: `EditorChoice` is a union rather than an optional bundle id precisely so the two cannot collapse, since an Orca user who lands outside a worktree wants their editor where a System Default user asked for the file association.

Worth knowing before picking Orca: a raw transcript is never inside a worktree, living under `~/.claude/projects` or `~/.codex/sessions`, so "Open Raw Transcript" always falls through. The setting earns its place on `⌘⇧O`, where the files a transcript names usually are in a project.

Orca takes a file only when it belongs to a worktree, and `--worktree path:` matches a root exactly rather than any directory inside one, so the worktree is derived from the file by containment. Deriving it from the session's directory would be wrong twice over: that directory is usually below its own root, and it says nothing about where a file the session merely mentioned actually lives.

Anything in no worktree falls back to `openPath`, which tries the chosen app, then VS Code, Cursor, Zed, VSCodium, Sublime Text and TextEdit — the transcript itself needs that chain, being `.jsonl`, which macOS claims no application for. Only the kinds an editor cannot render — images, PDFs, video, spreadsheets — are handed to macOS instead, ahead of even an explicitly chosen editor, and that direction is deliberate. The obvious rule is the opposite one, a list of extensions too dangerous to hand over, but which application opens an extension is a per-machine setting the user can change at will: `.sh` is bound to a terminal emulator here, `.jar` to JavaLauncher, `.zip` to Archive Utility. A gap in the allowlist costs someone a spreadsheet in VS Code; a gap in the denylist runs a script they meant to read.

Windows gets one opener rather than a chain, because it has nothing to build a chain out of. ShellExecute reports success whenever it showed the user _something_, including the "How do you want to open this file?" picker for an unclaimed extension, so an association failure is not observable and nothing can sit behind it as a fallback. The file goes to `Invoke-Item -LiteralPath`, run through `powershell.exe` — not `cmd.exe /c start`, which re-parses `&`, `|`, `^` and `%` out of a path we got from transcript text, and Node only quotes an argument containing a space, tab or quote. `-ErrorAction Stop` is needed because `Invoke-Item` reports a missing file as a non-terminating error, which would exit zero and swallow it. The one exception is `NO_WINDOWS_HANDLER`, the extensions a stock Windows claims nothing for: `.jsonl` is exactly what "Open Raw Transcript" hands over, so naming Notepad up front is the only way to skip a dialog the user would otherwise face every time.

## Resuming sessions

`src/lib/terminal.ts` resolves the "Resume Sessions In" preference, and keeps the decision separate from the launching: `launchPlan` returns what would be run as data, so every terminal's arguments and quoting are unit-tested without launching anything. On the Windows half that is the only way they are tested at all, this being a macOS development machine.

Terminal.app and iTerm2 expose no useful command line and are scripted through `osascript`, which stacks two escaping layers — shell single-quoting inside an AppleScript string literal — over a directory name we do not control. The rest of the macOS terminals take a working directory and a command as argv through `open -n -b … --args`, where nothing re-parses the string. Those need `$SHELL -lc` around the command, since Raycast spawns the extension without a login environment and neither `claude` nor `codex` is otherwise on PATH, and they re-exec the shell afterwards so the window survives the agent exiting.

Windows has no `open`, and it has a trap underneath: Node spawns a detached child with `DETACHED_PROCESS`, and a process created that way is attached to no console at all. `powershell.exe -NoExit` spawned directly therefore gets no window, and `-NoExit` then keeps that headless process alive forever, leaking one per resume. So a console program is wrapped in a launcher — `powershell -NoProfile -Command "Start-Process -FilePath … -ArgumentList @(…) -ErrorAction Stop"` — where `Start-Process` is what allocates the console and the thing we spawn is short-lived and windowless. The GUI-subsystem terminals, `wt.exe` and `wezterm-gui.exe` and `alacritty.exe`, make their own windows and stay direct spawns.

`Start-Process` also fixes the reporting: `-ErrorAction Stop` turns "the target will not start" into a non-zero exit, which `execute` converts into the caller's fallback instead of a silent no-op. That matters because `wt.exe` ships as an App Execution Alias stub that spawns cleanly and then exits non-zero when Windows Terminal is not actually installed — an ENOENT check alone would call that a success and close the Raycast window over nothing. Hence the 600ms grace window in `execute`: a non-zero exit inside it rejects, a process still alive at the end is a success, and ENOENT is undelayed.

`wt` needs a rule of its own. It splits its command line on unescaped semicolons _anywhere_ in it, per argv element and with no quote awareness — the delimiter is matched after `CommandLineToArgvW` has already consumed the quoting, so wrapping the argument in quotes buys nothing. A `Set-Location …; <command>` script handed to wt therefore becomes two half-formed subcommands: a tab that only `cd`s, and a second tab running the agent in the wrong directory. `wt` takes `-d` for the working directory, so the `Set-Location` prefix is dropped there entirely, and `wtArgs` escapes `;` in every argument rather than the one that happened to look suspect.

PowerShell's own quoting is a third rule again: single-quoted literals have no backslash escape, the quote is doubled, and `Set-Location -LiteralPath` is what stops `[` and `]` in a directory name being read as a glob.

Reattaching to a running session is Orca's alone, since no other terminal can be asked what it is running, so it applies only when Orca is the resolved terminal — never on Windows, where Orca does not exist. `useOrcaTerminals` skips its pane sweep entirely otherwise, both to save a subprocess per pane and because a live dot that Enter will not act on promises something the row cannot do.

Everything below the chosen terminal degrades rather than fails: an app that was uninstalled since it was picked falls back to the one that ships with the OS, and only that failing reaches the clipboard-and-toast path in the command file.

## Platform differences

The manifest currently declares `"platforms": ["macOS"]`, and the terminal dropdown is filtered to what a Mac can drive, so none of the Windows half is reachable by a user today. It is kept whole and tested because the alternative — deleting it and writing it again — is how the quoting rules below get relearned the hard way. Widening `platforms` and letting the drift test admit the Windows entries is what turns it back on.

`IS_WINDOWS` in `src/lib/paths.ts` is the only platform test in the extension. Raycast's `platforms` manifest field is a store-listing declaration rather than something a command can read, and the `environment` API exposes no platform property, so it is `process.platform` — and every function whose behaviour turns on it takes it as a defaulted argument, which is what makes the other platform's branch reachable from the unit suite.

Three things beyond the launchers differ:

- **Path spelling.** Windows accepts both separators and its APIs hand back either, so a cwd copied out of a transcript may be `C:/Users/Aki/code` where the root the user typed is `C:\Users\Aki\code`. The spelling is settled once, by `normalizeSeparators`, where a path _enters_ the extension — the search root in `normalizeRoot`, the session cwd as the manifest is built — and every split and comparison downstream then assumes it. Teaching `isUnder` alone to tolerate both spellings is the tempting shortcut and it is wrong: containment would start saying yes to paths that `projectRoot`, the dropdown keywords and the ignore list all still segment on a single separator, so a session would be visible and mis-grouped rather than merely missing. `isUnder` folds case only, which the filesystem genuinely does and no amount of normalizing at the edge can fix.
- **Binary discovery.** The `BIN_DIRS` that widen `PATH` for our subprocesses are per-platform: Homebrew, MacPorts and the version-manager shims on one side, scoop, winget, Chocolatey and the npm prefix on the other, the machine-wide roots read from `%ProgramData%`/`%ProgramFiles%` rather than assuming C:. `spawnEnv` also drops every existing spelling of PATH before inserting its own, because Windows spells it `Path`: copying the environment and assigning `PATH` leaves both, libuv sorts the child's block case-insensitively so the pair compares equal, and which one the child resolves `claude` against becomes arbitrary.
- **Named editors.** They exist on macOS only. `EDITOR_CHOICES` identifies apps by bundle id, and Windows has no counterpart: the GUI executables are not on PATH, and the CLI shims are `.cmd` files, which Node refuses to spawn without a shell. Rather than guess install directories, every choice defers to the file association there.

The Windows half is written against the documented behaviour of each tool, and every argument it constructs is pinned by the unit suite, but none of it has been executed on Windows. What the suite cannot tell you, in the order worth checking:

- Whether `Start-Process` really allocates the console, and whether `-ArgumentList` survives both PowerShell 5.1, which joins its elements with spaces, and newer versions, which quote them. The reasoning is that `-Command` takes the rest of the line as one program either way, so both land the same script — but that is an argument, not a run.
- Whether `wt.exe`, `wezterm-gui.exe` and `alacritty.exe` resolve through the widened PATH, or need their install directories added to `BIN_DIRS`.
- Whether the 600ms grace window in `execute` is long enough to catch a launcher that fails and short enough not to be felt. It is a guess calibrated to nothing.
- Whether `Invoke-Item` opens what the association promises, and whether the `NO_WINDOWS_HANDLER` set is the right size — too small and the user meets the picker dialog, too large and Notepad overrides an association they chose.

## Preferences

All four are declared in `package.json`. See the [README](README.md#preferences) for what they mean.

`searchRoot` is the only required one, and it carries no default on purpose: any directory the manifest named would be one machine's convention, and a user who keeps code elsewhere would install the extension and see nothing, with the fix buried in settings. Being required means Raycast collects it in its own setup form before the command first runs, which costs one field and removes the empty first result.

The ignore list matches whole path segments of a session's working directory, so it filters results rather than indexing: `corpus.ts` reads every transcript either way. That is also why build-artifact names do so little, nobody launching an agent from inside `node_modules`; the entries that actually fire are the scratch and cache directories. The list stays long anyway because a wrong entry costs one deletion, and the description says as much.

Both app preferences are required `dropdown`s, not `appPicker`s. The manifest schema gives `appPicker` no way to filter what it lists, so it offers every application on the machine, 1Password included, as somewhere to resume a coding session. A dropdown's `data` is a curated list, and being required puts both on the setup form so where things open is settled before the command first runs. It also keeps resolution synchronous: `resolveTerminal` and `resolveEditor` are pure functions of a stored id and the platform, read once at module load beside the others. The ids are macOS bundle ids for the entries that predate the Windows port, kept verbatim so a preference chosen before it still resolves, alongside plain slugs — `system`, `windows-terminal` — for the entries that never had one.

`required` is worth checking through `raycast-env.d.ts`: an `appPicker` stayed optional in the generated type even when required, where these dropdowns generate a non-optional union of their own values.

`TERMINALS` and `EDITOR_CHOICES` are the source of truth, and `package.json` repeats them because a manifest cannot import from TypeScript. `tests/*.test.ts` compare the two and fail on any drift, and a second test asserts every offered terminal has a driver on at least one platform: an entry without one would be offered, picked, and then resume nothing. Orca is the exception, reached through its own CLI rather than through a launch plan. That invariant is what let the "front the app and copy the command to the clipboard" path go, along with `LaunchPlan`'s `activate` variant.

The alternative was to leave the pickers optional and choose from the installed applications, which was built and then removed. A manifest `default` is static JSON and cannot say "Orca if it is installed, otherwise VS Code", so auto-selection needed `getApplications` behind a hook, a seeded first frame to stop the primary action retitling itself a beat after the list appeared, and a one-time notice to tell the user what had been chosen for them silently. Asking the question outright costs one dropdown at install and none of that.

`MAC_EDITORS` survives from it, no longer a priority list but the chain `openPath` walks when the chosen app cannot take the file. It ends at TextEdit because macOS ships it, so a transcript always opens somewhere. Picking System Default stores no bundle id at all, which is exactly what puts plain `open` at the head of that chain.

## Scripts

Run everything from this directory.

```sh
npm install
npm run dev        # ray develop: registers with Raycast, then watches with hot reload
npm run build      # ray build -e dist: compiles and type-checks
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
npm test           # unit suite on Node's built-in runner, no extra dependencies
npm run bench      # wipe the cache, time a cold index, report time-to-first-row per query
```

`npm run bench` takes queries as arguments to benchmark your own.

## Store metadata

`assets/icon.png` is 512×512, rendered from the hand-authored `design/icon.svg`. The source sits outside `assets/` because the store asks that everything in there be loaded by the extension at run time, and the SVG never is. Screenshots live in `metadata/` at 2000×1250.

Capture them with a plain region grab (⌘⇧4 dragged around the window), then crop with `scripts/crop-shot.py <capture.png> metadata/search-agent-sessions-N.png`. It finds the window, scales it to the frame width the existing shots use, and centres it the same way, so every shot in the gallery lands on identical pixels. Don't use macOS window capture (⌃⌘⇧4 then space) or Raycast's "Window Capture": both re-render the window off-screen, which washes out its fill and leaves rectangular artifacts wherever a popover or dropdown is open, since those are separate windows whose backdrop has nothing to sample.
