# Google Calendar

Manage your Google calendar easily. Create events, search contacts, and check out your upcoming schedule.

## Quick Create Event

Create calendar events instantly using natural language. Just type what you want and the extension parses it in real-time.

### Basic Examples

```
Lunch tomorrow at noon
Team meeting 3pm
Dentist Friday 2pm
Coffee with Sarah next Monday 10am
```

### Time Formats

| Format | Example |
|--------|---------|
| Standard | `3pm`, `3:30pm`, `15:00` |
| Time range | `2-3pm`, `2pm-3pm`, `9-930` |
| EU format | `14h`, `14h30` |
| Keywords | `morning`, `noon`, `afternoon`, `evening`, `night`, `midnight` |
| With timezone | `3pm EST`, `3pm PT`, `9-930 CT` |

**Note:** Bare times from 1-4 default to PM (e.g., `meeting 2-3` = 2pm-3pm). Times 5-11 default to AM.

### Duration

| Syntax | Example |
|--------|---------|
| Equals shortcut | `=30m`, `=1h`, `=90m` |
| Natural language | `for 30 minutes`, `for 1 hour` |

### Calendar Selection

Use `/` followed by a calendar name to select which calendar to add the event to:

```
Lunch tomorrow /work
Doctor appointment Friday /personal
Team sync 3pm /engineering
```

The extension uses fuzzy matching, so `/eng` would match "Engineering" calendar.

### Event Types

| Type | Syntax | Example |
|------|--------|---------|
| Out of Office | `ooo` prefix | `ooo tomorrow`, `ooo Dec 26-Jan 2` |
| Focus Time | `focus`, `ft`, `deep work` | `focus 2-4pm`, `ft tomorrow morning` |

### Multi-day Events

```
ooo Dec 26-Jan 2
vacation tomorrow through Friday
ooo Feb 3-26, 2027
conference Dec 26, 2027 - Jan 3
```

### Recurring Events

| Pattern | Example |
|---------|---------|
| Daily | `every day`, `daily` |
| Weekly | `every Monday`, `weekly` |
| Biweekly | `every other week`, `biweekly` |
| Monthly | `every month`, `monthly` |
| Ordinal | `every third Thursday`, `every last Friday`, `every 1st Monday` |
| Interval | `every 2 days`, `every 3 weeks` |

### Location

| Syntax | Example |
|--------|---------|
| Single word | `@zoom`, `@office` |
| Multi-word | `@(Conference Room B)`, `@(123 Main St)` |

### Attendees

```
Meeting with john@company.com
Sync with alice@example.com, bob@example.com
1-on-1 with manager@company.com 3pm
```

### Notes

Append notes to your event description using `//`:

```
Team standup 9am // Discuss Q1 roadmap
Lunch with client noon // Bring proposal docs
```

URLs in your input are automatically detected and added to the event description.

### Alerts

| Syntax | Example |
|--------|---------|
| Exclamation shortcut | `!15m`, `!1h`, `!1d` |
| Alert keyword | `alert 15m`, `alert 1 hour` |
| Remind keyword | `remind 30 minutes` |

### Show As (Availability)

| Syntax | Effect |
|--------|--------|
| `~free` | Show as free/available |
| `~busy` | Show as busy |

### Complete Examples

```
Team standup every Monday 9am /engineering
ooo Dec 26-Jan 2 ~free
Lunch with john@company.com tomorrow noon @(Cafe Milano) // Discuss partnership
Focus time 2-4pm !15m
Doctor appointment Friday 3pm /personal alert 1 day
Weekly sync every Thursday 10am PT with team@company.com
```

## Other Commands

- **Create Event**: Form-based event creation with all options
- **List Events**: View your upcoming calendar events
- **List Calendars**: Browse all your Google calendars
- **Search Contacts**: Search your Google Contacts
