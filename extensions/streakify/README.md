# Streakify

Track and manage your daily streaks with custom emojis — right from Raycast and the menu bar.

## Features

- **Create Streak** — name, custom emojis, optional starting day (for transfers), menu-bar visibility
- **Manage Streaks** — check in, undo, edit, freeze, reset, delete, show/hide in menu bar
- **Auto-reset** — missing a day resets the streak to 0 (unless frozen)
- **Freeze** — protect a streak while you're away; no check-in required
- **Menu Bar** — live status (`✅🔥3` / `❌📚1` / `🧊🎯5`), check in or unfreeze from the bar

### Custom Emojis per Streak

| Field                   | Purpose                             | Default |
| ----------------------- | ----------------------------------- | ------- |
| Streak Emoji            | Main emoji next to the name         | 🔥      |
| Checked Today Emoji     | Shown when already checked in today | ✅      |
| Not Checked Today Emoji | Shown when not yet checked in       | ❌      |

Frozen streaks show 🧊 in the status slot.

## Commands

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| Create Streak      | Form to create a new streak               |
| Manage Streaks     | List of all streaks with actions          |
| Streakify Menu Bar | Persistent menu-bar status (interval 10s) |

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run publish
```

## License

MIT
