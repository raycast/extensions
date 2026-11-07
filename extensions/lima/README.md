# Lima

Start, stop and open your [Lima](https://lima-vm.io) virtual machines, create them from templates, and run your own `lima.yaml` manifests, in a keyboard-first split view: the list on the left, the selected one on the right.

## Setup

Install Lima, like with `brew install lima`. The extension finds `limactl` on your login shell's PATH, so Homebrew, mise and nix installs all work. If it can't, set **limactl Path** in the extension's preferences.

## Commands

| Command         | Shows                                                       |
| --------------- | ----------------------------------------------------------- |
| Instances       | Your instances, grouped by status, with their resources     |
| Create Instance | A quick instance from one of Lima's templates               |
| Run Manifest    | Your own `lima.yaml` files, with the instance each one made |
| Image Cache     | The disk images Lima downloaded, and the space they take    |
| Volumes         | Lima disks, used or not, and the space they take            |

## Manifests

A manifest is a `lima.yaml` of your own: what an instance builds on, its sizes, mounts, ports and provision scripts. Keep them in one folder, `~/lima` unless you set **Manifests Folder** in the preferences, and Run Manifest lists them.

- **One file, one instance.** The instance is named after the file: `dev.yaml` makes `dev`. So each row knows its instance and shows whether it's running, stopped or not created yet.
- **↵ follows the state**: Run (create, then start), Start, or Open Shell.
- **⌘↵ Run with Changes** opens the manifest's values in a form, to run a second copy (`dev-2`) or a bigger one. Changed fields override the file; the file stays as it is.
- **⌘N New Manifest** writes a file that builds on a template, with the usual settings written out but commented, and opens it in your editor.
- **⌥⌘O Run File…** runs a manifest from anywhere.

Lima copies a manifest when it creates the instance, so editing the file later doesn't change the instance. When a file was saved after its instance was made, the row says **Changed** and offers **Recreate from Manifest** (⌃⇧R): it deletes the instance, disk and all, and creates it again from the file. It asks first.

Lima runs provision scripts on every boot, so keep them safe to run twice.

## Logs

Lima has no logs command, so **Show Logs** (⌘L, from Instances or Run Manifest) puts an instance's three logs side by side:

- **Lima**: Lima's own log for the instance (`ha.stderr.log`), as time, level and message.
- **Console**: the VM's serial console, for boots that fail.
- **Provision**: what the provision scripts printed, read inside the VM, so only while it runs.

Each shows its last 200 lines, newest first, and reads them again every 2 seconds while the instance runs. Errors are marked ✖ and warnings ▲. Type to filter lines, or pick Warnings and Errors. ↵ follows the log in Terminal or iTerm, ⌘↵ copies the lines shown, and ⇧⌘C copies the whole log.

## Image Cache

Lima keeps every image it downloads in `~/Library/Caches/lima`, so the next instance made from it doesn't download it again. Deleting an instance leaves its image there. **Image Cache** lists them biggest first, split into **Not Used** and **Used by Instances**, with each one's size, when it was downloaded and which instances name it.

- **⌃X Delete from Cache** deletes one.
- **⌃⇧X Delete Unused** deletes every one no instance uses.
- **Clear Entire Cache** runs `limactl prune`.

Each asks first and says how much it frees. Running instances aren't affected: each has its own copy of its disk. Only making an instance again downloads its image again.

## Volumes

Deleting an instance deletes its own disk, and everything inside it, Docker volumes included. A **volume** is a Lima disk (`limactl disk`) that outlives instances, so its data can go to the next one. **Volumes** lists every one there is, used or not: **In Use** by a running instance, **Attached** to one that's stopped, or **Not Attached**, with how much each takes on this Mac and the most it can hold.

**⌃X Delete Volume** deletes one, and warns when an instance won't start without it. A volume a running instance holds can't be deleted until it stops.

Deleting an instance leaves its volumes, and the confirmation says which.

## Shortcuts

| Shortcut | Instances                                            | Run Manifest                          |
| -------- | ---------------------------------------------------- | ------------------------------------- |
| ↵        | Open shell (running) or start (stopped)              | Run, start or open shell              |
| ⌘↵       | Copy shell command (running) or start and open shell | Run with changes                      |
| ⇧⌘C      | Copy SSH command                                     |                                       |
| ⌘L       | Show logs                                            | Show logs                             |
| ⌘I       | Show the template's notes                            |                                       |
| ⌥⌘S      | Stop                                                 |                                       |
| ⇧⌘R      | Restart                                              |                                       |
| ⌃X       | Delete instance                                      |                                       |
| ⌃⇧R      |                                                      | Recreate from manifest (when Changed) |
| ⌘E       | Edit the instance's `lima.yaml`                      | Edit the manifest                     |
| ⇧⌘F      | Show in Finder                                       | Show in Finder                        |
| ⌘N       | Create instance: from a template or a manifest       | New manifest                          |
| ⌥⌘O      |                                                      | Run a file from anywhere              |
| ⌘R       | Refresh                                              | Refresh                               |

Open Shell runs `limactl shell` in a new Terminal or iTerm window. Pick which in the preferences.
