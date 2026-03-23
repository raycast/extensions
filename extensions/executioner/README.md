# Executioner

An advanced process manager for macOS. Kill processes instantly without confirmation dialogs, manage multiple processes at once, find what's hogging your ports, freeze runaway processes, and more.

## Commands

### Executioner (Main)

The primary process list with full control over every running process.

- **Sort by** CPU, Memory, PID, Name, or Type via the dropdown
- **Group by** None, Type (App/System/Helper), Parent Process, or Usage Tier (Hog/Normal/Idle)
- Color-coded CPU and memory tags — red for hogs, yellow for moderate
- App icons shown for recognized applications

### Kill by Port

Find and kill processes listening on any TCP port. Shows all listening ports on launch, or type a specific port number to filter.

### Resource Hogs

A dedicated view showing only processes exceeding your configured CPU or memory thresholds. Kill them individually or wipe them all at once.

### Recently Killed

Tracks every process you kill. Re-kill respawning processes by name with a single action.

## Features

### Instant Kill

Every kill action fires immediately — no confirmation dialogs, ever. Three levels of force:

| Action | Shortcut | Signal |
|--------|----------|--------|
| Kill | `Return` | SIGTERM |
| Force Kill | `Cmd+Return` | SIGKILL |
| Force Kill (Sudo) | `Cmd+Shift+Return` | Elevated SIGKILL |

### Multi-Select

Tag multiple processes and kill them all at once:

| Action | Shortcut |
|--------|----------|
| Toggle Select | `Cmd+S` |
| Select All Visible | `Cmd+Shift+A` |
| Kill Selected | `Cmd+Shift+K` |
| Force Kill Selected | `Cmd+Shift+Opt+K` |

### Bulk Actions

| Action | Shortcut |
|--------|----------|
| Kill All Visible | `Ctrl+Shift+K` |
| Force Kill All Visible | `Ctrl+Shift+Opt+K` |

### Process Control

| Action | Shortcut | Description |
|--------|----------|-------------|
| Freeze | `Cmd+F` | Pause a process (SIGSTOP) |
| Resume | `Cmd+F` | Resume a frozen process (SIGCONT) |
| Raise Priority | `Cmd+Up` | Renice -5 (requires sudo) |
| Lower Priority | `Cmd+Down` | Renice +5 |
| Kill Duplicates | `Cmd+Opt+D` | Kill all copies except the oldest |

### Detail Panel

Toggle with `Cmd+Shift+D` to see full process info: path, PID, PPID, CPU, memory, nice value, uptime, and open ports.

### Copy Actions

| Action | Shortcut |
|--------|----------|
| Copy PID | `Cmd+Shift+C` |
| Copy Path | `Cmd+Shift+,` |
| Copy Process Info | `Cmd+Shift+I` |

## Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-Refresh | 3 seconds | How often the process list refreshes (1s, 2s, 3s, 5s, 10s, or off) |
| CPU Hog Threshold | 10% | Processes above this CPU % are flagged red |
| Memory Hog Threshold | 1024 MB | Processes above this memory usage are flagged red |
| Show PID | On | Display PID next to process name |
| Close Window After Kill | Off | Auto-close Raycast after killing a process |
