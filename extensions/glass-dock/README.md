# Glass Dock

Monitor the local Glass Dock daemon and control container workloads from
Raycast.

## Requirements

- macOS on Apple Silicon
- Glass Dock and `glassdockctl` installed on the same user account
- Raycast 1.26 or later

The extension checks these standard command locations:

- `/opt/glassdock/bin/glassdockctl`
- `/opt/homebrew/bin/glassdockctl`
- `/usr/local/bin/glassdockctl`

If the command is elsewhere, set **Glass Dock Control Executable** in the extension
preferences to its absolute path.

## Command

**Glass Dock** is one searchable view. It shows daemon status, containers, and
diagnostics. Open a status or diagnostics item for detail. Container items keep
start, stop, log, and copy-ID actions in their action panels.

The extension does not use a shell. It sends fixed arguments to
`glassdockctl`. It does not send data to an external service. Stop and restart
are available only for a daemon that Glass Dock Control manages. Daemon stop
and restart are blocked while a container is running.

## Local development

From the repository root:

```sh
make control
make raycast-install
cd raycast
npm run dev
```

For a source build, set **glassdockctl Executable** to the absolute path of
`.build/debug/glassdockctl`. You can also put a reversible link in a standard
location before you start Raycast development mode:

```sh
ln -s "$(cd .. && pwd)/.build/debug/glassdockctl" /opt/homebrew/bin/glassdockctl
```
