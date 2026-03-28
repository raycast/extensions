# Timer

Start countdown timers instantly from Raycast. No AI, no delays — just type and go.

## Setup

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. **Important**: Set an alias for instant access — Raycast → Settings → Extensions → Timer → Timer command → Alias: `timer`

## Usage

### Start a timer

Type `timer` followed by a duration:

```
timer 30m
timer 3s
timer 1h30m
timer 5m check slack
```

Anything after the time becomes a label: `timer 10m standup` → "standup (10m)"

### Supported formats

| Input | Duration |
|-------|----------|
| `30m` | 30 minutes |
| `3s` | 3 seconds |
| `2h` | 2 hours |
| `1h30m` | 1 hour 30 min |
| `90` | 90 minutes |
| `30 minutes` | 30 minutes |

### List timers

Search `List Timers` to see running timers with live countdowns. Cancel any timer with Enter.

## How it works

- Timers run inside Raycast's command process — no background daemons
- Completion sound is a pitched Glass chime ascending a major scale
- Timer data stored in Raycast's encrypted LocalStorage
- Completed timers auto-remove from the list
