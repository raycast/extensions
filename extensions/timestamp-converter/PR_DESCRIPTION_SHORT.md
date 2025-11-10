# Quick PR Description (简洁版)

## One-Line Summary
Smart timestamp converter with auto-detection, real-time current time display, and multi-timezone support.

---

## Short Description (150 words)

Timestamp Converter is a developer-focused Raycast extension that makes working with timestamps effortless. Simply type `ts` or `timestamp` and:

- **Enter a timestamp** (10 or 13 digits) → See it as ISO 8601, localized format, relative time, etc.
- **Enter a datetime** → Get Unix timestamps (seconds/milliseconds) and other formats
- **Leave it empty** → View current time in all formats with real-time updates

Features:
- Smart auto-detection of input type
- 8 supported timezones (Local, UTC, Beijing, New York, etc.)
- 6+ output formats including relative time ("2 hours ago")
- Multiple keyword aliases (ts, time, unix, datetime)
- Configurable preferences
- One-click copy or paste

Perfect for developers analyzing logs, testing APIs, debugging time issues, or working across timezones.

---

## Key Differentiators (核心差异)

1. **Smart single command** - auto-detects timestamp vs datetime
2. **Empty input shows current time** - with live updates
3. **All formats at once** - no need to choose output format
4. **Quick access aliases** - ts, time, unix, etc.

---

## Why This Extension?

Eliminates the need to:
- Open browser timestamp converter websites
- Remember whether you're converting TO or FROM timestamp
- Switch between different timezone converters
- Manually refresh for current time

Everything is instant, local, and integrated into your Raycast workflow.

---

## Technical Highlights

- TypeScript + React hooks
- date-fns for reliable date handling
- Real-time updates (1 second interval)
- Input throttling for performance
- Zero external API calls

---

## Use This When You Need To:

✅ Convert log timestamps to readable dates  
✅ Get Unix timestamp for API requests  
✅ Check current time in multiple timezones  
✅ Verify timestamp correctness  
✅ Debug time-related issues  
✅ Quick timezone conversions  

---

## Sample Use Case

```
Developer sees timestamp in logs: 1699622400
Opens Raycast → Types "ts 1699622400"
Instantly sees:
  → 2023-11-10T16:00:00+08:00 (ISO 8601)
  → 2023-11-10 16:00:00 (Full)
  → 3 months ago (Relative)
  → All formats ready to copy
```

---

## Categories
Developer Tools

## Keywords
timestamp, unix, epoch, datetime, time, timezone, converter, date, utc

