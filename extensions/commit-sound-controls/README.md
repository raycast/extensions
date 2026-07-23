# Commit Sounds for Raycast

Make successful Git commits sound like yours.

**Commit Sounds** is a Raycast extension for macOS and Windows. Configure a sound once for a GitHub user or organization, and it plays after each matching local commit—without a background app, network call, or push required.

For example, one `databrainhq` rule covers every current and future repository with an `origin` such as `https://github.com/databrainhq/frontend-mono.git`.

## What you can control

| Control                            | What it does                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GitHub owner or organization rules | Play a unique sound for any GitHub user or organization. One organization rule covers all of its repos.              |
| Audio source                       | Upload an MP3, M4A, WAV, AIFF, or AAC file, or provide a direct HTTP(S) audio link. Linked audio is downloaded once. |
| Volume                             | Set a separate playback volume for every owner and author sound.                                                     |
| Playback cooldown                  | Collapse rapid agent commits into one sound; the default is five seconds and can be changed in Raycast.              |
| Author policy                      | Play sounds for every local commit author, or only a set of selected Git email addresses.                            |
| Author overrides                   | Give a specific Git author email its own sound while keeping the same organization rule.                             |
| GitHub connections                 | Optionally connect multiple GitHub identities, choose a default owner, and select organizations from each identity.  |

The extension only reacts to commits made on the same computer. It cannot play a sound when a teammate commits from their machine or when a pull request is merged on GitHub.

## Requirements

### macOS

- Raycast
- Git
- macOS `afplay` (included with macOS)

### Windows

- Raycast for Windows
- Git for Windows, including Git Bash
- PowerShell (included with Windows)

Windows playback uses PowerShell's Windows media stack and runs from the Git for Windows post-commit hook. No additional audio player is required.

## Set it up

1. Install **Commit Sounds** from the Raycast Store, then run **Commit Sound Controls**.
2. Select **Add GitHub Owner Rule**.
3. Enter the owner portion of your remote, choose a sound, pick a volume, and save.

To find the owner for the repository you are in:

```bash
git config --get remote.origin.url
```

Examples:

| Remote                                          | Rule to add   |
| ----------------------------------------------- | ------------- |
| `https://github.com/wicolian/commit-sounds.git` | `wicolian`    |
| `git@github.com:databrainhq/frontend-mono.git`  | `databrainhq` |

After saving the first rule, the extension installs a global `post-commit` hook. Your next successful local commit in a matching repository plays the sound.

## Organizations, including new repositories

You never need one rule per repository. Add the organization once:

```text
databrainhq
```

That matches all current and future `github.com/databrainhq/*` repositories automatically.

You can add an organization manually with **Add GitHub Owner Rule**—no GitHub connection or employer permission is needed. Or connect GitHub and use **Add Organization Rule** to select an organization from your account. The organization picker requests `read:org` to show private memberships; disconnect and reconnect an existing account if it was connected before that permission was added.

## Decide who triggers sounds

Open **Commit Sound Controls** → **Commit Authors**.

- **Everyone who commits on this Mac**: any author can trigger a matching GitHub owner or organization rule.
- **Only selected author emails**: restrict playback to the Git emails you enter. Add both a work email and a GitHub noreply address if you use both.
- **Individual Author Sound**: override the organization sound for one author email.
- **Minimum Time Between Sounds**: mute rapid follow-up commits for 0, 1, 3, 5, 10, or 30 seconds. Five seconds is the default, so agents can make micro-commits without stacking producer tags.

Author matching uses the author email on the commit, not the GitHub account currently signed into Raycast. Check the email Git will use with:

```bash
git config --get user.email
```

## Commands

| Raycast command            | Use it for                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Commit Sound Controls**  | Enable or disable playback, manage rules, test audio, manage connected GitHub accounts, author policy, and global-hook health. |
| **Add Commit Sound**       | Quickly create an owner or organization rule with an audio file/link and volume.                                               |
| **Connect GitHub Account** | Add a separate, optional GitHub OAuth identity. Existing sound rules stay unchanged.                                           |

## How it works

The extension writes its own local data under:

```text
~/.git-commit-sounds/
```

This includes the configuration, copied audio files, and a small global Git hook. The hook:

1. runs after a successful local commit;
2. reads the repository's `origin` remote;
3. extracts the GitHub owner or organization;
4. applies the author policy and optional author override; and
5. starts the matching sound in the background.

The hook never reads repository content, commit diffs, or Git credentials. It does not use a daemon, so there is no idle CPU or RAM cost.

## Using Commit Sounds with Husky or another local hook manager

Git uses one `core.hooksPath`. If a repository uses a local Husky path, it overrides the global Commit Sounds hook. Add this bridge as `.husky/post-commit` to make both run:

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

"$HOME/.git-commit-sounds/hooks/post-commit"
```

Make it executable:

```bash
chmod +x .husky/post-commit
```

Commit the bridge if the whole team wants the behavior, or place `.husky/post-commit` in that checkout's `.git/info/exclude` to keep it personal and local-only.

## Troubleshooting

### No sound after a commit

1. Run **Commit Sound Controls** and use **Test Sound** on the rule.
2. Confirm the rule's owner matches `git config --get remote.origin.url`.
3. If author filtering is enabled, compare the selected email list with `git show -s --format=%ae`.
4. Check for a local override with `git config --show-origin --get-all core.hooksPath`. Use the Husky bridge above when a repository-local hook path is present.
5. Run **Install or Repair Global Hook** from Commit Sound Controls.

### Audio file is missing

The controls list marks a missing file. Edit the rule and choose or link the sound again.

### Another global hook manager is installed

Commit Sounds does not overwrite another global `core.hooksPath`. Keep that hook manager and merge the contents of `~/.git-commit-sounds/hooks/post-commit` into its post-commit behavior.

## Privacy

- Audio and configuration remain on your computer.
- Audio links are downloaded only when you save a rule; commits are offline.
- GitHub OAuth is optional and used only for account/organization selection.
- The extension does not transmit commit messages, diffs, repository contents, or Git credentials.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

## License

[MIT](LICENSE)
