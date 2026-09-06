# Streakify

Track and manage your daily streaks with custom emojis.

## Features

- **Create Streak** — Add a new streak with a name, custom emojis, and optional starting day (useful when transferring from another app).
- **Manage Streaks** — View all streaks, check in for today, undo today's check-in, edit, reset, or delete.

### Custom Emojis per Streak

| Field | Purpose | Default |
|-------|---------|---------|
| Streak Emoji | Main emoji next to the name | 🔥 |
| Checked Today Emoji | Shown when you already checked in today | ✅ |
| Not Checked Today Emoji | Shown when you haven't checked in yet | ❌ |

### Starting Day

When creating a streak you can set a **Starting Day** (default `0`).  
If you already have a 17-day streak elsewhere, just type `17` and continue from there.  
When the starting day is greater than 0, today is automatically marked as checked so the streak doesn't break on the first day.

## Commands

| Command | Description |
|---------|-------------|
| Create Streak | Form to create a new streak |
| Manage Streaks | List of all streaks with actions |

## Development

```bash
npm install
npm run dev
```

Then open Raycast — the commands appear at the top while the extension is in development mode.

## License

MIT
