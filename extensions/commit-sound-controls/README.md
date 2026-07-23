# Commit Sounds

Commit Sounds is a macOS Raycast extension that plays a custom audio cue after a successful Git commit. Create separate rules for GitHub users or organizations, choose a local sound or a direct audio link, and set the volume for each rule.

The extension is designed to stay out of the way: Raycast is only used to configure rules. A tiny Git `post-commit` hook runs after a commit, finds the GitHub owner of the repository's `origin` remote, and plays the matching local file with macOS `afplay`.

## Features

- Upload an audio file or use an HTTP(S) audio link.
- Download linked audio once, rather than during a commit.
- Configure one rule per GitHub owner or organization.
- Choose a separate playback volume for each rule.
- Test, replace, remove, enable, or disable rules in Raycast.
- Optionally connect GitHub with Raycast OAuth to prefill your own account name and choose organizations you belong to.
- Work with both SSH and HTTPS GitHub remotes.
- No separate background process and no idle CPU or RAM cost.

## Requirements

- macOS
- Raycast
- Git
- macOS `afplay` (included with macOS)

## Install

Once published, install **Commit Sounds** from the Raycast Store. To run it from source during development, clone this repository and run:

```bash
npm install
npm run dev
```

## Quick start

1. Open Raycast and run **Add Commit Sound**.
2. Enter the GitHub owner to match—for example `octocat`, `wicolian`, or `my-organization`.
3. Choose exactly one audio source:
   - **Audio File**: select an MP3, M4A, WAV, AIFF, or AAC file from your Mac.
   - **Audio Link**: provide a direct HTTP(S) URL to one of those file types.
4. Select a playback volume and press Enter to save.
5. Make a successful commit in a repository whose `origin` remote belongs to that owner.

For example, a rule for `wicolian` matches both:

```text
git@github.com:wicolian/commit-sounds.git
https://github.com/wicolian/commit-sounds.git
```

## Raycast commands

| Command                    | What it does                                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add Commit Sound**       | Opens directly to the owner, audio upload/link, and volume form. Add as many GitHub user or organization rules as you need.                                                                                                   |
| **Commit Sound Controls**  | Shows status and every configured rule; test, edit, remove, enable/disable, repair the hook, or choose an organization from a connected identity.                                                                             |
| **Connect GitHub Account** | Starts a new, separate GitHub OAuth session. Connect multiple identities, select a default owner, or disconnect an identity from **Commit Sound Controls**. It does not limit which users or organizations you can configure. |

## GitHub accounts

GitHub OAuth is optional: sound rules work for any GitHub user or organization that you type into the rule form. When you do connect GitHub, **Commit Sound Controls** provides a dedicated account manager where you can:

- connect another GitHub identity without replacing the existing one;
- choose which connected identity pre-fills new sound rules; and
- disconnect an identity, which removes its Raycast OAuth token but leaves its existing sound rules untouched.

Connected accounts can also list their GitHub organizations through **Add Organization Rule**. Choose an organization to prefill a sound rule; the rule matches repositories whose GitHub remote uses that organization as its owner. This asks GitHub for `read:org` in addition to the basic profile permission, so private organization memberships can appear. Existing connections can continue to add organization names manually; disconnect and connect them again if you want the picker to access private memberships.

If the browser opens GitHub under the wrong identity, use **Switch GitHub Account in Browser** before continuing the OAuth flow.

## Audio sources and storage

Local audio files are copied into the extension support folder. Audio links are downloaded once, with a 20 MB limit, and stored in the same folder. A commit never needs a network connection to play a sound.

The supported formats are `.mp3`, `.m4a`, `.wav`, `.aiff`, and `.aac`.

## How it works

On first use, Commit Sounds configures Git's global `core.hooksPath` to:

```text
~/.git-commit-sounds/hooks
```

The generated `post-commit` hook reads its local configuration from:

```text
~/.git-commit-sounds/config
```

After a successful commit, it reads the `origin` remote, extracts the `github.com` owner, and plays the first matching rule in the background. Repositories that are not on GitHub, do not have an `origin` remote, or have no matching owner remain silent.

The hook is short-lived and uses no persistent daemon. Raycast does not need to be open when committing.

## Privacy and permissions

- Your audio files and rule configuration stay on your Mac.
- A linked audio file is downloaded only when you save that rule.
- GitHub OAuth is optional. It requests `read:user` to obtain the connected account name and `read:org` only to list organizations in the optional picker.
- The extension does not read repository contents, send commit metadata, or alter Git credentials.

## Troubleshooting

### No sound after committing

1. Run **Commit Sound Controls** and confirm sounds are enabled.
2. Test the rule from its action menu.
3. Confirm the repository uses a matching GitHub `origin` remote with `git remote -v`.
4. Check whether the repository has its own `core.hooksPath`; a repository-level hooks path overrides the global path.

### The audio file is missing

Open **Commit Sound Controls**. A missing file is marked in the rule list. Edit the rule and select or link the audio again.

### Another global Git hook setup already exists

Commit Sounds refuses to overwrite a different global `core.hooksPath`. Keep the existing setup and merge the generated hook behavior into it, or choose one global hook manager.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

`npm run dev` loads the extension into Raycast with hot reload. `npm run build` produces the release build.

For Raycast Store preparation, use [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) to capture screenshots and run final validation.

## License

[MIT](LICENSE)
