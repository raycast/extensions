# 🍅 Pomodoro Timer for Raycast

A clean, feature-rich Pomodoro timer extension for Raycast with gamification and professional productivity features.

## ✨ Features

### ⏱️ **Timer Modes**

- **Pomodoro Sessions** (default 25 min) - Focus time with XP rewards
- **Short Breaks** (default 5 min) - Quick recharge between sessions
- **Long Breaks** (default 15 min) - Extended rest after multiple pomodoros

### 🎮 **Gamification**

- **XP System** - Earn 100 XP per completed pomodoro
- **Streak Tracking** - Track consecutive days of productivity
- **Progress Bar** - Visual feedback with retro-style characters (█ ░)
- **Level-Up Messages** - Motivational completion notifications

### 📊 **Statistics**

- Daily pomodoro count
- Total completed sessions
- Current streak (days)
- Total focus time tracked
- Automatic daily reset at midnight

### ⚙️ **Customization**

- **Custom Durations** - Pass any duration as argument (e.g., `25m`, `1h`, `90s`)
- **Preferences** - Configure default durations in extension settings
- **Auto-start Breaks** - Optional automatic break timer after pomodoros
- **Long Break Interval** - Suggest long breaks after X pomodoros (default: 4)
- **Background Mode** - Timer continues running when view is closed

### 💾 **Persistence**

- Timer state survives app restarts
- Statistics saved locally
- Resume interrupted sessions automatically
- Pause/resume functionality

### 🔔 **Notifications**

- Large HUD messages for visual feedback
- Completion alerts without distracting sounds
- Smart long break suggestions

## 🚀 Usage

### Basic Commands

1. **Start Timer** - Launch with default pomodoro duration
2. **Pause Timer** - Temporarily pause without losing progress
3. **Resume Timer** - Continue from where you paused
4. **Reset Timer** - Start over with current mode
5. **Start in Background** - Run timer without keeping window open

### Custom Durations

Launch with custom duration argument:

```bash
pomodoro 30m    # 30-minute session
pomodoro 1h     # 1-hour session
pomodoro 90s    # 90-second session (minimum 10s)
```

### Keyboard Shortcuts

Configure custom shortcuts via Raycast preferences:

- Start/Resume timer
- Pause timer
- Reset timer

## ⚙️ Configuration

### Extension Preferences

Access via Raycast Settings → Extensions → Pomodoro:

| Setting                    | Default | Description                               |
| -------------------------- | ------- | ----------------------------------------- |
| **Pomodoro Duration**      | `25m`   | Default work session length               |
| **Short Break Duration**   | `5m`    | Quick break length                        |
| **Long Break Duration**    | `15m`   | Extended break length                     |
| **Auto-start Breaks**      | `false` | Automatically start breaks after pomodoro |
| **Long Break Interval**    | `4`     | Pomodoros before suggesting long break    |
| **Enable Background Mode** | `true`  | Allow timer to run in background          |

### Input Validation

- **Minimum Duration**: 10 seconds
- **Maximum Duration**: 4 hours (14,400 seconds)
- **Supported Formats**: `25m`, `1h`, `90s` (seconds/minutes/hours)

## 📈 Statistics Tracking

The extension tracks:

- `completedPomodoros` - Lifetime pomodoro count
- `todayPomodoros` - Resets at midnight daily
- `currentStreak` - Consecutive days with completed pomodoros
- `totalFocusTime` - Cumulative minutes of focused work
- `lastCompletedDate` - For streak calculation

**Data Storage**: Local storage via Raycast API (persists across updates)

## 🎨 UI Design

### Visual Style

- Clean markdown-based interface
- Emoji-rich status indicators
- Retro progress bar characters
- Game-inspired messaging

### Status Indicators

- 🍅 Pomodoro Mode
- ☕ Short Break Mode
- 🌴 Long Break Mode
- ⏰ Time Display
- 🎯 Status Label (READY/ACTIVE/PAUSED/COMPLETE)

## 🏗️ Technical Details

### Architecture

- **Framework**: Raycast Extension API v1.103.0
- **Language**: TypeScript + React
- **State Management**: React Hooks
- **Persistence**: LocalStorage API
- **Timer Accuracy**: Timestamp-based (no drift)

### Error Handling

- Try-catch blocks around all LocalStorage operations
- Automatic recovery from corrupted data
- Console logging for debugging
- Graceful degradation on errors

### Performance

- Efficient 100ms timer intervals
- Minimal re-renders with proper memoization
- Lazy state loading
- Optimized progress calculations

## 🐛 Known Issues

1. **Timer Precision**: Sub-second accuracy not guaranteed (checks every 100ms)
2. **Midnight Reset**: Daily stats reset based on `toDateString()` (timezone-aware)

## 📝 Development

### File Structure

```
pomodoro/
├── src/
│   └── pomodoro.tsx      # Main component
├── assets/               # Icons and images
├── package.json          # Extension manifest + preferences
├── tsconfig.json         # TypeScript config
├── eslint.config.js      # Linting rules
└── README.md             # This file
```

### Key Functions

- `parseDuration()` - Parse time strings to seconds
- `getPreferenceDurations()` - Load user preferences
- `loadState()` / `saveState()` - Timer persistence
- `handleTimerComplete()` - Completion logic + notifications
- `getDuration()` - Mode-based duration resolution

### Extending

To add new features:

1. Add preference in `package.json`
2. Update `Preferences` interface in code
3. Access via `getPreferenceValues<Preferences>()`
4. Implement logic in component

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built with ❤️ by Byqb using:

- [Raycast API](https://developers.raycast.com/)
- TypeScript + React
- Indie game aesthetic inspiration

---

**Tip**: For best results, use the Pomodoro Technique properly:

1. Choose a task
2. Set timer for 25 minutes
3. Work until timer rings
4. Take a 5-minute break
5. Every 4 pomodoros, take a longer 15-minute break

Stay focused! 🚀

## 🔗 Links

- **GitHub**: [@byqb](https://github.com/byqb)
- **Website**: [byqb.cv](https://byqb.github.io/cv/)
