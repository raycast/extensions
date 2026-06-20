# Lumen — Find Anything

Scoped fuzzy file search across the folders you actually work in. Jump into a favorite
folder with a shortcut and find anything inside instantly — no Finder, no clicking through
subfolders. Plenty of small tools to find what you want fast, with minimal typing.

**No telemetry. No accounts. No subscriptions. No bullshit.** Local-first, keyboard-first,
and yours to configure.

Lumen is **navigator first, search second**: enter a workspace and you see its top level,
like opening the folder. Start typing and it turns into a recursive fuzzy search scoped to
that folder. Want something outside your folders? Type `h ` and you're searching your whole
home, freely.

## So...now what?

Type the short alias of a folder you want to open. Hit space. You're in. That easy.

Now search — a couple of letters is usually enough. Need to narrow it down? Filter by
extension, date, or file type. Don't like the defaults I shipped? Change them. It's yours
now, exactly how you need it.

And just like that, you've found anything. Whatever you were after.

## Why you'll like it

- **It's fast.** `fd` + `fzf` under the hood. Sub-second on your scoped folders.
- **It's keyboard-first.** Open, Quick Look, Copy Path and Show in Finder — all with one
  hand, no mouse.
- **It's configurable.** Categories, ordering tools and date filters are all editable codes
  you rename to whatever you like (which is also why it needs no translation).
- **It stays out of your way.** No background indexing, no daemon, no network at runtime
  after the first launch.

## The search bar grammar

| You type | It does | Example |
|---|---|---|
| `word word` | fuzzy terms (AND), path-aware | `proj plan` |
| `.ext` | filter by extension (OR) | `.pdf .mp4` |
| `-` | show "files" only |
| `-code` | filter by category | `-d` (docs), `-a` (audio) |
| `--code` | order results | `--dc` created · `--dm` modified · `--big` · `--small` |
| `--code,arg` | date arguments (combinable, order-free) | `--dc,2024` · `--dc,mar` · `--dc,week` · `--dc,mar,2024` |

## Keyboard

| Key | Action |
|---|---|
| `↵` | Open (file in its app, folder in Finder) |
| `⌘C` | Copy the containing folder path |
| `⌘⇧C` | Copy the full path |
| `⌘F` | Show in Finder |
| `⌘D` | Quick Look (toggle) |
| `⌘R` | Refresh the index |

## Home mode

Type `h ` to fuzzy-search everything under `~`, with the same grammar and keyboard. It
streams `fd | fzf` so a huge tree never lands in memory, and your configured workspaces are
excluded by default — so Home stays for the stuff *outside* your scoped folders.

## Requirements

- **macOS** (Apple Silicon and Intel). No setup: Lumen downloads the `fd` and `fzf` binaries
  for your Mac on first launch, then runs fully offline.

## Setup

1. **Manage Workspaces** — add a folder, give it a name and one or more aliases.
2. Open **Lumen**, type your alias + space, and search.
3. **Manage Tools** to tweak categories, ordering tools and date filters — or switch the UI
   language (English / Español / your own imported pack) in the extension preferences.

---

Made by **Páramo Studio**. Open source — explore the code and my other projects (Óculo,
Páramo Kiln Monitor, and more) on [GitHub](https://github.com/ParamoStudio).
