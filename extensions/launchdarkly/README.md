# LaunchDarkly Extension for Raycast

> **Note**: This is an unofficial extension and is not affiliated with LaunchDarkly.

Browse your LaunchDarkly feature flags, targeting rules, environments and recent changes without leaving your keyboard. The extension is read-only: it never modifies anything in LaunchDarkly.

## Features

- 🔍 Search flags by key or name, with filters for state, type, ownership and tags
- 🏷️ Flag details: variations, per-environment targeting, rules, prerequisites and maintainer
- 🌍 Environments with their LaunchDarkly colors, criticality, and evaluation status (new / active / inactive / launched)
- 📜 Recent Changes: browse the audit log for the whole project or a single flag, filtered by environment
- ⭐ Favorites and recently viewed flags at the top of the list
- 🗂️ Switch between projects from any command's action menu (`⌘⇧S`) without editing preferences
- 📋 Copy the flag key, the LaunchDarkly URL, or an SDK code snippet (Node, React, Python, Go, Java, Ruby)
- 🔗 Create Raycast quicklinks to individual flags
- 🔄 Toggle between flag names and keys; reorder environments to your liking

## Setup

1. Create a LaunchDarkly API access token:
   - Log in to LaunchDarkly
   - Go to **Organization settings → Authorization**
   - Create a token with the `Reader` role (the extension only reads data)
2. Configure the extension in Raycast (`Configure Extension` action, no need to open a command):
   - **LaunchDarkly API Token**: the token from step 1
   - **Default Project Key** (optional): used until you pick a project with the *Switch Project* action; defaults to `default`
   - **LaunchDarkly Instance URL** (optional): only change for the EU instance (`https://app.eu.launchdarkly.com`) or a self-hosted relay

## Commands

### List Feature Flags

Search flags in the current project. The dropdown filters by **state** (live, deprecated, archived), **type** (temporary, permanent), **My Flags** (flags you maintain) and **tags**. Favorites and recently viewed flags appear above the results when the search is empty.

| Shortcut | Action |
| --- | --- |
| `↵` | Show flag details |
| `⌘ ↵` | Open in LaunchDarkly |
| `⌘ ⇧ C` | Copy feature flag key |
| `⌘ ⇧ P` | Add to / remove from favorites |
| `⌘ ⇧ H` | Show the flag's change history |
| `⌘ ⇧ L` | Show recent changes for the project |
| `⌘ ⇧ S` | Switch project |
| `⌘ ⇧ T` | Toggle between flag names and keys |
| `⌘ R` | Refresh |

The **Copy** section of the action panel also offers the LaunchDarkly URL, SDK code snippets, and *Create Quicklink*.

### Flag Details

The first row summarises the flag; each following row is an environment. Selecting an environment shows whether it is on, the value served by default, individual targets (users and other context kinds), targeting rules with segment names resolved, prerequisites, and the evaluation status reported by LaunchDarkly.

| Shortcut | Action |
| --- | --- |
| `↵` | Open the selected environment in LaunchDarkly |
| `⌘ ↵` | Copy feature flag key |
| `⌘ ⇧ ↑` / `⌘ ⇧ ↓` | Move the environment up / down (the order is remembered for all flags) |
| `⌘ ⇧ H` | Show the flag's change history |
| `esc` | Back to the list |

### Recent Changes

The project's audit log, newest first, with the environment as a tag. Use the dropdown to restrict it to one environment; select an entry to read the full description and any comment. From a flag's action panel, *Show Change History* opens the same view scoped to that flag.

| Shortcut | Action |
| --- | --- |
| `↵` | Open the history in LaunchDarkly |
| `⌘ ⇧ C` | Copy a summary of the change |
| `⌘ ⇧ S` | Switch project |
| `⌘ R` | Refresh |

### Switching projects

*Switch Project* (`⌘⇧S`) is available in the action menu of both commands. It lists the projects your token can access and makes one the active project everywhere; the choice is remembered until you change it or reset to the preference default.

## Development

`npm run mock-server` starts a local server on `http://localhost:4000` that mimics the LaunchDarkly endpoints used by the extension (flags, projects, environments, flag status, tags, segments, audit log). Point the **LaunchDarkly Instance URL** preference at it to develop without a real account.
