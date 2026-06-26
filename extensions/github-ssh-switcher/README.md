# GitHub SSH Switcher for Raycast

A [Raycast](https://raycast.com) extension to switch between multiple GitHub accounts by loading the right SSH key into the agent with a single keystroke.

Useful when you work with several GitHub identities (personal, work, university…) from the same machine and need a fast way to swap between them.

## How it works

Selecting an account runs three steps in sequence:

1. **Clear** — removes all current identities from the SSH agent (`ssh-add -D`)
2. **Load** — adds the account's private key to the agent (`ssh-add <keyPath>`)
3. **Test** — verifies the connection to GitHub (`ssh -T <host>`)

On success a toast notification confirms the active account. On failure a detail view shows exactly which step failed and the raw SSH output, so you can diagnose the problem without leaving Raycast.

## Prerequisites

| Requirement | Notes |
|---|---|
| [Raycast](https://raycast.com) | Tested on Raycast 1.x |
| Node.js 18+ | `brew install node` |
| SSH keys for each GitHub account | One key pair per account |
| Host aliases in `~/.ssh/config` | See setup below |
| Passphrases stored in macOS Keychain | One-time setup per key |

## Setup

### 1. Generate SSH keys

If you do not have a key pair for each account yet, create one:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519_github_work
```

Then add the public key to the corresponding GitHub account under
**Settings → SSH and GPG keys**.

### 2. Configure `~/.ssh/config`

Add a `Host` block for each account. The `Host` value is the alias used by
this extension; `HostName` must always be `github.com`:

```
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_work

Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_personal

Host github-university
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_university
```

You can verify the aliases work from a terminal:

```bash
ssh -T github-work
# Hi your-username! You've successfully authenticated...
```

### 3. Store passphrases in macOS Keychain (one-time)

The extension runs outside a terminal and cannot prompt for passphrases
interactively. Store each passphrase in the macOS Keychain once:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_work
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_personal
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_university
```

After this `ssh-add` will load those keys silently, without any prompt.
Keys without a passphrase do not require this step.

### 4. Edit `src/accounts.ts`

Open `src/accounts.ts` and replace the example accounts with your own:

```typescript
export const ACCOUNTS: Account[] = [
  {
    title: "Work",                          // label in Raycast
    subtitle: "your-email@company.com",    // shown as subtitle
    keyPath: "~/.ssh/id_ed25519_github_work",
    host: "github-work",                   // must match Host in ~/.ssh/config
  },
  {
    title: "Personal",
    subtitle: "your-github-username",
    keyPath: "~/.ssh/id_ed25519_github_personal",
    host: "github-personal",
  },
];
```

## Installation (development mode)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/raycast-github-ssh-switcher.git
cd raycast-github-ssh-switcher

# 2. Install dependencies
npm install

# 3. Start the extension in development mode
npm run dev
```

`npm run dev` builds the extension and registers it with the running Raycast
app. Any change to `.ts` / `.tsx` files triggers an automatic rebuild.

> **Icon refresh:** Static assets (including the extension icon) are only
> reloaded when `npm run dev` restarts. If you change the icon, stop the
> process (`Ctrl+C`) and run `npm run dev` again.

## Usage

1. Open Raycast (`⌘ Space`)
2. Search for **Switch GitHub SSH Account**
3. Select the desired account and press `↵`
4. A toast notification confirms the switch, or opens a detail view with the
   error if something went wrong

## Project structure

```
raycast-github-ssh-switcher/
│
├── assets/
│   └── extension-icon.png      # 512×512 RGBA icon
│
├── src/
│   ├── accounts.ts             # Account type definition + ACCOUNTS list
│   ├── ssh.ts                  # SSH utilities: env resolution, command
│   │                           # execution, switch flow
│   └── switch-account.tsx      # Raycast command: list UI + error detail view
│
├── package.json                # Extension manifest + npm scripts
├── tsconfig.json               # TypeScript configuration
├── LICENSE
└── README.md
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Build and watch in development mode |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Lint with Raycast's ESLint config |
| `npm run fix-lint` | Auto-fix linting issues |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error connecting to agent` | `SSH_AUTH_SOCK` not set in Raycast's env | Restart Raycast; the extension queries `launchctl` as fallback |
| `No such file or directory` | Key file path is wrong | Check `keyPath` in `src/accounts.ts` |
| `Permission denied (publickey)` | Wrong key for that GitHub account | Verify the public key is registered in GitHub Settings |
| Empty SSH output | Key has a passphrase not in Keychain | Run `ssh-add --apple-use-keychain <keyPath>` once |
| `Could not resolve hostname` | `Host` alias missing in `~/.ssh/config` | Add the `Host` block (see Setup step 2) |

## License

[MIT](LICENSE) © Ricardo Chocano del Cerro
