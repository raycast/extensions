# ghq plus

Find, open, and clone repositories managed by [ghq](https://github.com/x-motemen/ghq) from [Raycast](https://www.raycast.com).

| Command               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **List Repositories** | Search repositories under your ghq roots and open them.  |
| **Get Repository**    | Clone a repository with `ghq get` (HTTPS or SSH).        |

## Requirements

- [Raycast](https://www.raycast.com) on macOS
- [ghq](https://github.com/x-motemen/ghq#installation) and Git

```bash
brew install ghq
```

## Setup

Raycast does not load your shell `PATH`, so set the absolute path to `ghq` once.

1. Run `which ghq` and copy the path (for example `/opt/homebrew/bin/ghq`).
2. Open **Raycast Settings > Extensions > ghq** and paste it into **Ghq Path**.
3. Choose an **Editor**, a **Terminal**, or both. **List Repositories** needs at least one.

   ```bash
   which ghq
   ```

   | Installed with           | Typical path             |
   | ------------------------ | ------------------------ |
   | Homebrew (Apple silicon) | `/opt/homebrew/bin/ghq`  |
   | Homebrew (Intel)         | `/usr/local/bin/ghq`     |
   | `go install`             | `~/go/bin/ghq`           |
   | Nix                      | `~/.nix-profile/bin/ghq` |

4. Run **List Repositories** or **Get Repository**. The first time, Raycast asks for the required **Ghq Path** preference: paste the output of `which ghq`. A leading `~/` is expanded to your home directory.
5. Open the extension preferences (**Raycast Settings > Extensions > ghq**) and choose an **Editor**, a **Terminal**, or both. **List Repositories** needs at least one of them; until then it shows **Editor or Terminal Not Configured**, and `↵` takes you to the same preferences. **Get Repository** works without them.
6. Optional: turn on **Clone Protocol** > **Clone with SSH** if you normally clone over SSH.

## Commands

### List Repositories

Lists every repository `ghq list` reports, across all of your ghq roots. Each item is titled with its path relative to the root, for example `github.com/x-motemen/ghq`, with the host on the right. Search matches the path, the repository name, the owner, and the host.

| Action                        | Shortcut                          |
| ----------------------------- | --------------------------------- |
| **Open in _Editor_**          | `↵`                               |
| **Open in _Terminal_**        | `⌘ ↵` (`↵` when no Editor is set) |
| **Show in Finder**            | `⌘ ⇧ F`                           |
| **Copy Path** (absolute path) | `⌘ ⇧ C`                           |

- The open actions carry the name of the application you picked, for example "Open in Visual Studio Code".
- The last result is cached, so the list appears immediately and refreshes in the background.
- When the list is empty or the search matches nothing, the view shows **No Repositories** and `↵` opens the **Get Repository** form. The search text is not carried over: the form opens empty, or filled from the clipboard (see below). The list refreshes when the clone succeeds and when you come back.

### Get Repository

A form that runs `ghq get [-p] -- <repository>`. Submit it with `⌘ ↵`.

| Field              | Description                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repository**     | Anything `ghq get` accepts: `https://github.com/owner/repo`, `git@github.com:owner/repo.git`, `owner/repo`, or a bare repository name. Whitespace inside the value is rejected.              |
| **Clone with SSH** | Runs `ghq get -p`. The initial state comes from the **Clone Protocol** > **Clone with SSH** preference, so you can override it per repository. An SSH address is cloned over SSH either way. |

- **Clipboard auto-fill.** If the clipboard contains nothing but an `https://github.com/owner/repo...` URL or a `git@github.com:owner/repo.git` address when the form opens, the **Repository** field is filled in for you. It never overwrites what you have already typed. Anything else is ignored: other hosts, `http://` or `ssh://` URLs, `github.com/owner/repo` without a scheme, and plain `owner/repo` text.
- **GitHub page URLs work.** `https://github.com/owner/repo/tree/main`, `.../issues/1`, `.../repo.git`, or a URL with a query string or fragment is reduced to `https://github.com/owner/repo`, both when auto-filling and when you submit. `git@github.com:owner/repo.git` is kept as is.
- **Cancel.** While ghq runs, the **Getting repository** toast offers a **Cancel** action that stops ghq together with the `git clone` it started. A clone has no time limit, so cancel it if it hangs.
- **Leaving the form.** If you opened the form from **List Repositories** and go back to the list before the clone finishes, the clone keeps running, the toast still reports how it ended, and the list refreshes. When you run the **Get Repository** command itself, keep it open until the toast reports the result: once Raycast closes the command, the extension may no longer be able to report how the clone ended.
- **No update.** The extension runs `ghq get` without `--update`: a repository that is already cloned is left untouched.

When ghq finishes, the toast tells you what happened:

| Toast                        | Meaning                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloned**                   | A new repository was cloned. The message shows its path, for example `github.com/owner/repo`.                                                                       |
| **Already cloned**           | The repository was already in your ghq root.                                                                                                                        |
| **Repository ready**         | `ghq get` succeeded, but the extension could not tell whether the repository was new (for example, the letter case on disk differs from what you typed).            |
| **Cancelled**                | You stopped the clone. A clone that had already completed is reported as a success instead.                                                                         |
| **Failed to get repository** | Git or ghq failed. The message is a one-line summary; **Copy Logs** copies the error output. See ["Failed to get repository"](#failed-to-get-repository).           |
| **Failed to run ghq**        | ghq could not be started, or the `ghq list` lookup that runs before the clone failed or took longer than 10 seconds. See ["Failed to Run ghq"](#failed-to-run-ghq). |

After a success, the repositories that `ghq get` produced are listed with the same actions as **List Repositories**, so `↵` opens the fresh clone in your editor. Without an Editor or Terminal, the list still offers **Show in Finder** and **Copy Path**. If the extension cannot locate the repository (a **Repository ready** toast that only shows what you typed), no list is shown and the form stays open.

## Preferences

| Preference                              | Required | Description                                                                                        |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| **Ghq Path**                            | Yes      | Absolute path to the ghq binary (the output of `which ghq`).                                       |
| **Editor**                              | No\*     | Application that opens the selected repository with `↵`.                                           |
| **Terminal**                            | No\*     | Application that opens the selected repository with `⌘ ↵` (`↵` when no Editor is set).             |
| **Clone Protocol** > **Clone with SSH** | No       | Off by default. When on, **Get Repository** starts with **Clone with SSH** checked (`ghq get -p`). |

\* **List Repositories** needs at least one of the two.

All preferences live in **Raycast Settings > Extensions > ghq**.

## Troubleshooting

### Warning views

Each of these views has a single action, **Open Extension Preferences** (`↵`).

| Title                                 | Meaning                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Ghq Path Not Configured**           | The **Ghq Path** preference is blank. Paste the output of `which ghq`.                                                      |
| **Editor or Terminal Not Configured** | **List Repositories** has no application to open repositories with. Choose an **Editor**, a **Terminal**, or both.          |
| **Failed to Run ghq**                 | `ghq root --all` or `ghq list --full-path` failed, or took longer than 10 seconds. The description is the underlying error. |

### "Failed to Run ghq"

**Get Repository** reports the same problem as a **Failed to run ghq** toast. Typical messages:

- `spawn ... ENOENT`: there is no file at the configured path. Run `which ghq` again and update **Ghq Path**. See the typical paths in [Setup](#setup).
- `spawn ... EACCES`: the path is a directory or is not executable.
- A Git error: the **Ghq Path** is fine, but Git does not work. ghq needs Git to read its configuration, and the listing and lookup commands run with the `PATH` Raycast provides (system directories only), so they use `/usr/bin/git`. Check that `/usr/bin/git --version` works; if it asks for developer tools, install the Xcode Command Line Tools (`xcode-select --install`).

### The list differs from `ghq list` in my terminal

ghq is started by Raycast, not by your shell, so variables exported in your shell profile, such as `GHQ_ROOT`, are not visible to it. Copy the value into your Git config instead, from a terminal where `GHQ_ROOT` is set:

```bash
git config --global ghq.root "$GHQ_ROOT"
```

If `GHQ_ROOT` lists several directories separated by `:`, add each one with `git config --global --add ghq.root <dir>` instead.

### "Failed to get repository"

There is no terminal to type into, so `ghq get` runs with `GIT_TERMINAL_PROMPT=0`: Git fails instead of waiting for a prompt nobody can answer. The toast shows a one-line summary of what Git or ghq reported.

- **`could not read Username for 'https://github.com': terminal prompts disabled`**
  The repository needs credentials and Git has none stored. Set up a credential helper (`gh auth setup-git`, or `git config --global credential.helper osxkeychain` and clone once in a terminal), or check **Clone with SSH** in the form.
- **`repository '...' not found`** or **`Repository not found.`**
  A typo, or a private repository that your credentials or SSH key cannot access.
- **`Permission denied (publickey).`**
  ssh cannot ask for a key passphrase either. Load the key into the macOS ssh-agent and test it:

  ```bash
  ssh-add --apple-use-keychain ~/.ssh/id_ed25519
  ssh -T git@github.com
  ```

  If you use another agent (1Password, Secretive), select it with `IdentityAgent` in `~/.ssh/config`. An `SSH_AUTH_SOCK` exported from your shell profile is not visible to Raycast.

- **`Host key verification failed.`**
  The host is not in `~/.ssh/known_hosts` yet and ssh cannot ask you to confirm it. Connect once from a terminal: `ssh -T git@github.com`.
- **`... (submodule <url>)`**
  `ghq get` clones submodules too, and this one could not be read. The fixes above apply to the submodule URL.

To reproduce a failure in a terminal, run `GIT_TERMINAL_PROMPT=0 ghq get <repository>`.

A failed or canceled clone can leave a partial repository behind. If a retry reports **Already cloned** but the repository is incomplete, delete its directory and get it again.

The toast's **Copy Logs** action copies what ghq and Git wrote to stderr (color codes removed, roughly the last 1 MiB if there is more). Include it when you [report an issue](https://github.com/windhorn/ghq/issues), but review it first: it contains repository URLs and local paths.

## License

MIT
