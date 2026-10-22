# InstaBox Manager

Manage your [InstaBox](https://instabox.sh) cloud computers directly from Raycast. Create machines, control their lifecycle, connect via SSH, run commands, and manage snapshots without opening the dashboard.

## Setup

1. Sign in to the [InstaBox dashboard](https://dashboard.instabox.sh) and open **API Keys**.
2. Create a key. **Full access** works for everything; for a **Restricted** key, pick the scopes you need:

   | Scope             | Used for                                                     |
   | ----------------- | ------------------------------------------------------------ |
   | `machines:read`   | Listing machines, details, usage                             |
   | `machines:write`  | Creating and controlling machines, SSH, Run Command, desktop |
   | `machines:delete` | Deleting machines                                            |
   | `images:read`     | Listing snapshots (also used by Create Machine)              |
   | `images:write`    | Creating snapshots                                           |
   | `images:delete`   | Deleting snapshots                                           |

3. Paste the key (`ibk_...`) into the extension's preferences.

## Commands

- **Manage Machines**: your machines grouped by state. Open SSH, run commands, open the desktop, pause, resume, stop, start, set the idle pause, edit labels, publish ports, snapshot and delete from the action panel.
- **Create Machine**: start a machine from a template (default `agent-browser`) or one of your snapshots, with an optional stop time, idle pause and optional Vault secrets.
- **Run Command**: run a shell command with `bash -lc` and see stdout, stderr and the exit code.
- **Manage Snapshots**: list snapshots, create machines from them, and delete them.

## Notes

- **SSH** uses a short-lived SSH token from the InstaBox API, so no CLI or SSH key is needed. Anyone with the copied command can log in until the token expires; set its lifetime in preferences and revoke tokens from the action panel.
- **Interactive desktop links** let anyone with the link control the desktop without signing in until they expire. Revoke them from the action panel.
- **Snapshots** include `/data/home` unless you choose system files only, which means credentials (gh, Claude, Codex, git, SSH) and `.env` files are saved too.
- **Stop After** is set when you create a machine and stops it once that time passes, busy or not; files are kept. InstaBox machines have no other time limit.
- **Pause When Idle** can only be changed if InstaBox lets your account choose it. Otherwise every machine pauses after a fixed idle time, shown in the form.
