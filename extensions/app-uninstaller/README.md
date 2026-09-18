# App Uninstaller

A [Raycast](https://raycast.com) extension that removes a macOS application **and the files it leaves behind** — caches, sandbox containers, preferences, launch agents, privileged helpers — after showing you exactly what it found and why.

Dragging an app to the Trash leaves its data on disk. Most uninstallers fix that by deleting anything whose name resembles the app, which is how people lose unrelated data. This one is built the other way round: it explains every match, treats weak evidence as weak, and moves things to the Trash instead of deleting them.

## What it does

1. Lists the applications installed in `/Applications`, `/Applications/Utilities` and `~/Applications`, with each bundle's size. Sort by size to find what is worth removing.
2. Scans the ~30 directories macOS applications write into, and attributes each hit to an app.
3. Groups the results by how certain the match is, with the reason shown on every row.
4. Moves the items you approve to the Trash, and explains anything macOS refused to move so you can fix it and retry with `⌘Y`.

It also tells you when something else is the better tool for the job: a Homebrew cask (`brew uninstall --cask --zap` knows the app's own cleanup list), or a vendor-supplied uninstaller.

## How matching works

| Confidence | Evidence | Pre-selected |
| --- | --- | --- |
| **Certain** | The file is named after the app's bundle identifier — `com.bitwarden.desktop`, `com.bitwarden.desktop.safari`, or the Team-ID group container `LTZ2PFU5D6.com.bitwarden.desktop`. | Yes |
| **Likely** | The file is named exactly after the application. | Yes |
| **Unsure** | Same developer prefix, or the app's name merely appears in the file name. | **No** |

Four rules keep the weak cases weak:

- **Names too generic to identify anything** (`Helper`, `Updater`, `Desktop`, `Code`…) are never matched on. Only the bundle identifier counts for those apps.
- **Contested files are demoted.** Every candidate is tested against *every* installed app. If another app matches it more strongly the file is dropped; if another app matches it equally, it is marked "Also matches <app>" and left unselected. This is what stops `Application Support/Claude` being attributed to Claude when Claude Code also claims it.
- **Folders belonging to another app are not searched.** `Slack/VideoDecodeStats` is Slack's file, however much it resembles the Stats app.
- **Depth raises the bar.** Two levels down, a resemblance-only match is discarded; only bundle-identifier and exact-name matches survive.

## Safety

The design assumption is that the matcher will eventually be wrong about something.

- **Nothing is deleted — everything goes to the Trash.** A wrong call costs you a drag back, not your data.
- **An allow-list, not a deny-list.** A path is removable only if it resolves inside one of the known application directories, is not that directory itself, and is no deeper than that directory permits. Everything else is refused.
- **Symlinks cannot escape.** The *parent* of each path is resolved before the check, so a symlinked folder inside a search directory cannot redirect a deletion elsewhere. The link itself stays removable.
- **Shared and system directories are protected.** `Application Support/Google` is never removable — only one app's folder inside it is. Neither is anything owned by macOS (`com.apple.*`, Keychains, Mail, Safari, iCloud…).
- **Privileges are escalated only when you ask, and only by macOS.** Root-owned items — every App Store application, and anything under `/Library` — are separated out and never included in an ordinary removal. Removing them is a distinct action on your explicit selection, which raises the system's own password dialog; the extension never sees your password, and a failed removal never silently retries as root. Unsure matches are no more pre-selected there than anywhere else.
- **Nothing in the Trash is overwritten.** A privileged move goes into a new, empty, user-owned folder in the Trash named after the app, so it can never land on top of a same-named item already there.
- **Nothing is interpolated into the privileged command.** Paths reach it as `argv` and are quoted by AppleScript's `quoted form of`, so a file name containing `$(…)`, `;` or quotes is one literal argument to `mv`. Every path is validated once more immediately before root acts, and the batch is refused entirely if any one of them fails.
- **No shell strings.** Every external call uses `execFile` with an argument list, so nothing in a filename is ever interpreted as shell syntax.
- **No network access, no telemetry.** The extension makes no outbound connections of any kind.

The path guard runs twice: once while scanning, and again in the only function that deletes, immediately before it acts. It is covered by tests, including a live symlink-escape attempt.

## Permissions

macOS protects both installed applications and other apps' sandbox containers, so two removals can be refused until you allow them:

| Symptom | Cause | Fix |
| --- | --- | --- |
| **Needs administrator** on a `.app` | The bundle is owned by root, which is how every App Store app is installed | Press `↵` on the item and authenticate — macOS shows its own password dialog |
| **In use by …** on a `.app` | Another process is running code from the bundle — very often an app extension the app installs, still loaded in its host | Quit the named process and retry |
| **Blocked by macOS** on a `.app` | Since Sonoma, one app may not move another app's bundle to the Trash | Privacy & Security → **App Management** → turn on Raycast |
| **Protected container** under `Library/Containers` or `Library/Group Containers` | macOS shields other apps' sandbox data | Privacy & Security → **Full Disk Access** → turn on Raycast |

The first of these is the one that looks like a permission problem and is not. Moving a directory to a different parent rewrites its `..` entry, which needs write permission on the directory itself — not just on `/Applications`. An App Store app's bundle is `drwxr-xr-x root:wheel`, so its owner can rename it inside `/Applications` but cannot move it out, no matter which privacy toggles are on. Ordinary files carry no `..`, which is why an app's leftovers move to the Trash while the app itself will not. The extension detects this up front and lists such items separately with a command that works, rather than failing on them.

The remaining two are easy to mistake for each other. Bitwarden, for example, ships a Safari extension: quitting Bitwarden leaves `safari.appex` loaded inside Safari, which holds the bundle open and blocks the move even with every permission granted. The extension checks for this before offering to remove an application, names the process, and offers to quit it — and diagnoses a failure the same way rather than blaming a permission that is already granted.

Because both are refused silently, the extension asks for them **before** the first use. The permission screen links straight to each pane, re-reads both every 1.5 seconds, and closes itself the moment they are granted — so it is only ever in the way while there is something to fix. Reopen it any time with `⌘⇧P`.

Detecting them takes two different methods. Full Disk Access is tested directly: a file only that permission can open is opened and immediately closed, with no bytes read. App Management has no such test — every possible probe would have to modify an application bundle — but macOS records the answer, so the extension reads it back from the TCC database instead of guessing: read-only, one constant query, one table, only the rows for that single permission, and nothing else in that database is touched. That record itself sits behind Full Disk Access, so without it App Management is reported as **Unknown** rather than assumed either way.

After toggling either one, macOS may ask to relaunch Raycast. The permission does not apply to the running process until it does.

If a removal is still refused, macOS reports it as a bare "could not be trashed" with no cause, so the extension diagnoses it from the path instead and puts the matching **System Settings** pane on the failing row as its first action. Grant it and retry with `⌘Y`.

Two fallbacks if you would rather not grant anything: `Copy Command to Trash Failed Items` gives you a `mv` command for your own shell — though a terminal is subject to the same protections unless it has been granted them — and for an application bundle, revealing it in Finder and dragging it to the Trash always works.

Failures are never silent: each one stays in the list with its path and reason, and `Copy Failure Details` puts the full text on the clipboard.

## Development

```sh
npm install
npm run dev     # load into Raycast
npm test        # path-guard and matcher tests
npm run lint
npm run build
```

`react-hooks/rules-of-hooks` is enabled on top of the Raycast ESLint config, which does not include it. A hook placed after a conditional `return` changes the hook order between renders and corrupts React's state for every hook in that component; it produced a render loop here once already, so it is an error rather than a warning.

`src/lib` holds the logic and has no Raycast dependency apart from `remove.ts`:

| File | Responsibility |
| --- | --- |
| `locations.ts` | Where applications install and where they write |
| `apps.ts` | Discovering installed apps, Homebrew casks, receipts, vendor uninstallers |
| `match.ts` | Attributing a file to an app, and the confidence it deserves |
| `scan.ts` | Walking the search directories and measuring what it finds |
| `safety.ts` | The path guard — what may and may not be removed |
| `size.ts` | Disk usage for a batch of paths |
| `elevate.ts` | The privileged move, and the authorization it needs |
| `remove.ts` | Moving to the Trash, failure diagnosis, and the commands for what it will not touch |

## Contributing

Pull requests are welcome. Two requests:

- Changes to `safety.ts` or `match.ts` should come with tests. Those two files decide what gets deleted.
- New search locations belong in `locations.ts` with a `depth` that is as small as the location allows.

## License

MIT — see [LICENSE](LICENSE).
