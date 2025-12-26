# Better Time Log

Better Time Log is a Raycast menu bar command that keeps your project timers always visible on macOS. Start ad-hoc sessions, run Pomodoro blocks, and log everything without leaving the top bar.

## Features

### ⏱️ Timer Management
- Start open-ended or countdown timers with custom title, project, and tags
- Launch Pomodoro routines with configurable focus/break lengths and cycles
- Keep the current timer visible in the Raycast menu bar with remaining time
- Pause and resume timers at any time

### 🏷️ Organization
- **Projects**: Assign sessions to projects with a smart dropdown (shows previously used projects)
- **Tags**: Add multiple tags like `#meeting`, `#coding`, `#research` to categorize work
- Filter history by project to understand where time goes

### 🔔 Pomodoro Features
- Auto-advance through focus and break phases
- **Sound notifications**: Hear distinct sounds when phases complete
  - Focus → Break: Glass sound
  - Break → Focus: Hero sound
  - All cycles complete: Funk sound
- Skip phases if plans change

### 📊 Analytics & Export
- **Time Summary**: View weekly/monthly breakdowns with project statistics
- **Export**: Copy data as CSV or JSON for external analysis
- Progress bars showing time distribution across projects

## Commands

| Command | Mode | Description |
| --- | --- | --- |
| `Better Time Log` | Menu Bar | Shows current timer and provides quick actions |
| `Start Timer` | View | Full form for starting open or Pomodoro timers |
| `Stop Timer` | No View | Stops the active timer and logs it |
| `Cancel Timer` | No View | Cancels without logging |
| `Pomodoro Presets` | View | Browse curated Pomodoro routines |
| `Time Log History` | View | Browse, filter, and edit logged sessions |
| `Time Summary` | View | Weekly/monthly stats with export options |
| `Assign Project` | View | Set or update the active timer's project |
| `Skip Pomodoro Phase` | No View | Jump to the next Pomodoro phase |
| `Pause Timer` | No View | Pause the running timer |
| `Resume Timer` | No View | Resume a paused timer |

## Usage

1. Open **Better Time Log** from the menu bar or search in Raycast
2. Use **Start Timer** to create a session with:
   - Title (e.g., "Sprint Planning")
   - Project (dropdown with existing projects + type new ones)
   - Tags (comma-separated: `meeting, planning`)
   - Timer type (Open or Pomodoro)
3. For Pomodoro, customize focus/break lengths and cycles
4. Timer appears in menu bar showing elapsed or remaining time
5. Stop from menu bar or use **Stop Timer** command — sessions are logged automatically
6. Open **Time Log History** to review and filter sessions by project
7. Use **Time Summary** to see weekly/monthly statistics and export data

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Export as CSV | `⌘E` |
| Export as JSON | `⌘⇧E` |
| Refresh | `⌘R` |
| Delete Session | `⌘⌫` |

## Development

```bash
npm install
npm run dev   # launches `ray develop`
npm run lint  # runs `ray lint`
npm run build # production build
```

## Author

Built by [@omerdduran](https://github.com/omerdduran)