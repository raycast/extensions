<div align="center">

<img src="media/extension-icon.png" width="128" alt="/dev/null">

# /dev/null

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://www.raycast.com/chrismessina/dev-null)
[![License MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)
[![Follow @chrismessina](https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social)](https://github.com/chrismessina)
[![Stars](https://img.shields.io/github/stars/chrismessina/raycast-dev-null?style=social)](https://github.com/chrismessina/raycast-dev-null/stargazers)

**Commit to [/dev/null](https://dev-null.sh), the social network for developers, from Raycast or Raycast AI. Your commit is signed with the SSH key you already use for GitHub.**

[Features](#features) • [Requirements](#requirements) • [First-Time Setup](#first-time-setup) • [Quick Start](#quick-start) • [Usage](#usage) • [Development](#development)

</div>

---

## Features

- **No login, no token**: /dev/null checks each commit's signature against the SSH keys GitHub publishes for your account, so there is nothing to sign in to or paste.
- **Works with your SSH agent**: finds keys in macOS's own agent, 1Password and Secretive, and in `~/.ssh`. It never reads a private key; your agent or `ssh-keygen` does the signing.
- **Images**: attach up to 3 JPEG, PNG or WebP images to a commit, by picking them or from the clipboard with `⌘ ⇧ V`.
- **Ask Raycast AI to post for you**: "@dev-null post that I just launched my extension", with a screenshot attached to the message. You approve the text and images before anything is posted.
- **Checked before it's sent**: the counter and the length limit match /dev/null's own rules (a link in your text counts as at most 23 characters; one inside code counts in full), and images are checked for type, size and dimensions, so a commit /dev/null would refuse for any of those is never signed or sent.
- **Profiles and search**: look anyone up by username, browse their commits, replies, followers and following, or search everyone's commits. **Go to My Profile** and **My Commits** open your own.
- **Start from a selection**: turn on **Selected Text** and Create Commit opens with whatever you had selected.
- **Drafts survive**: close the form mid-thought and your draft and images are still there next time.
- **A link to what you shipped**: after a commit lands, the toast's **Open Commit** opens it on /dev/null. If the commit is held for review, the toast says so.

---

## Requirements

- [Raycast](https://www.raycast.com/) on macOS
- A GitHub account, and a /dev/null account made by signing in at [dev-null.sh](https://dev-null.sh) with it
- An Ed25519 or RSA SSH key that is on your GitHub account

If you already push to GitHub over SSH, you probably have everything: sign in at dev-null.sh once and skip to [Quick Start](#quick-start).

---

## First-Time Setup

/dev/null has no password. It knows a commit is yours because it is signed with an SSH key, the same kind of key developers use to push code to GitHub, and that key is on your GitHub account. Setup puts a key on your Mac, adds it to GitHub, and introduces you to /dev/null.

### 1. Find or make a key

**If you use 1Password**, it can make and hold the key for you. In 1Password, create a new **SSH Key** item (choose Ed25519), then turn on **Settings → Developer → Use the SSH Agent**. 1Password will ask you to approve each commit with Touch ID. [Secretive](https://github.com/maxgoedjen/secretive) works the same way.

**Otherwise**, open Terminal and check for an existing key:

```sh
ls ~/.ssh/*.pub
```

If that lists a file such as `id_ed25519.pub`, and `ls ~/.ssh` shows the same name without `.pub` beside it, you have a key. If it says `no matches found`, make one:

```sh
ssh-keygen -t ed25519 -C "you@example.com"
```

Press Return to accept the default location. A passphrase is optional. If you set one, load the key into macOS's SSH agent so Raycast can use it without asking (Raycast can't show a passphrase prompt):

```sh
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

After a restart, run `ssh-add --apple-load-keychain` to load it again.

### 2. Add the public key to GitHub

Copy the **public** half of the key (the `.pub` file, never the other one):

```sh
pbcopy < ~/.ssh/id_ed25519.pub
```

With 1Password, open the SSH Key item and copy its **public key** instead.

Then on GitHub, go to **Settings → SSH and GPG keys → New SSH key**, paste it, and save. Either key type, Authentication or Signing, works.

### 3. Sign in at dev-null.sh

Sign in at [dev-null.sh](https://dev-null.sh) with GitHub. This creates your account, and it is also when /dev/null copies your keys from GitHub. **If you add a key later, sign in again** so /dev/null learns it.

### If something goes wrong

| Message | What to do |
| --- | --- |
| No Ed25519 or RSA SSH key found in your SSH agent or in ~/.ssh. | Make a key (step 1). With 1Password, check that its SSH agent is on. |
| None of your SSH keys are on the GitHub account of a /dev/null user. | Add the key to GitHub (step 2), then sign in at dev-null.sh again (step 3). |
| Could not sign your commit. | The rest of the message is what `ssh-keygen` reported. If it mentions a passphrase, the key isn't loaded: run the `ssh-add` command from step 1. |

---

## Quick Start

1. Open Raycast and search for **"Create Commit"**
2. Write your commit. The counter in the bottom left (`12 of 4,000`) shows how much of the 4,000 characters you have used.
3. To add images, press `⌘ N` (**Attach Image…**) and pick up to 3, or copy one and press `⌘ ⇧ V` (**Attach Image from Clipboard**).
4. Press `⌘ ⏎` to sign and post it. If your SSH agent asks for Touch ID or an approval, give it.

---

## Usage

### Commands

| Command | Mode | Description |
| --- | --- | --- |
| Create Commit | `view` | Write a commit, sign it with your SSH key, and post it to /dev/null |
| View Profile | `view` | Open someone's profile by username, or search for people |
| Go to My Profile | `view` | Your profile, commits, replies, followers and following |
| My Commits | `view` | The commits and replies you've posted |
| Search Commits | `view` | Search everyone's commits. The search runs when you pause typing, from 3 characters, since /dev/null allows 15 searches a minute. |

### AI Tools

| Tool | Description |
| --- | --- |
| Post Commit | Posts a commit with up to 3 images, after you confirm the text and images. Mention `@dev-null` in Raycast AI, and attach images to your message or give their paths, such as `~/Desktop/launch.png`. |

### Actions

| Action | Shortcut | Description |
| --- | --- | --- |
| Commit | `⌘ ⏎` | Sign the draft and post it |
| Attach Image… | `⌘ N` | Show the image picker |
| Remove Images | `⌃ ⇧ X` | Remove the images and hide the picker |
| Attach Image from Clipboard | `⌘ ⇧ V` | Attach the image on the clipboard: a copied image file, or image data such as a screenshot copied with `⌃ ⇧ ⌘ 4` |
| Open Commit | `⌘ O`, or in the success toast | Open the commit you just posted. Appears once a commit has posted. |

In a profile or a list of commits:

| Action | Shortcut | Description |
| --- | --- | --- |
| Open Commit / View Profile | `⏎` | Open the commit on /dev/null, or the person's profile |
| Copy Commit URL / Copy Profile URL | `⌘ ⇧ C` | Copy the link |
| Show | Dropdown | Switch between commits and replies |
| Hide Sidebar / Show Sidebar | `⌘ ⇧ D` | Hide or show the detail pane; remembered per command |

### Preferences

| Preference | Values | Default |
| --- | --- | --- |
| Username | text | empty: the account of your last commit |
| Selected Text (Create Commit) | checkbox | off |
| Debug Logging | checkbox | off |
| Strict Redaction | checkbox | off |

---

## Development

### Project Structure

```
raycast-dev-null/
├── src/
│   ├── create-commit.tsx   # The form: draft, images, counter, submit and toasts
│   ├── view-profile.tsx    # A profile by username, or a people search
│   ├── my-profile.tsx      # Your own profile
│   ├── my-commits.tsx      # Your commits and replies
│   ├── search-commits.tsx  # Search everyone's commits
│   ├── username.ts         # Remembers your username from your last commit
│   ├── components/         # Profile, commit and people views
│   ├── tools/
│   │   └── post-commit.ts  # The AI tool and its confirmation
│   └── lib/
│       ├── devnull.ts      # The /dev/null protocol: check, find a key, sign, post
│       ├── body.ts         # /dev/null's rules for the text, and its character count
│       ├── images.ts       # /dev/null's rules for images, and their sizes
│       └── api.ts          # Reading profiles, commits, followers and search
├── ai.yaml                 # AI instructions and evals
├── assets/                 # Extension icon (runtime)
├── media/                  # README images
├── package.json
└── tsconfig.json
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run Raycast ESLint config |
| `npm test` | Run the unit tests |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm run publish` | Publish to the Raycast Store |

### Clone & Run

```sh
git clone https://github.com/chrismessina/raycast-dev-null.git
cd raycast-dev-null
npm install
npm run dev
```

---

## Tech Stack

| Package | Role |
| --- | --- |
| `@raycast/api` | Raycast extension primitives |
| `@raycast/utils` | Higher-level Raycast utilities |
| `@chrismessina/raycast-kit` | Failure toasts with a Copy Error action |
| `@chrismessina/raycast-logger` | Debug logging with secrets redacted |

---

MIT © [Chris Messina](https://github.com/chrismessina)
