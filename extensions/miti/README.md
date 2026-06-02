# Miti

**Miti** is a Raycast extension for **Bikram Sambat (Nepali) calendar** workflows on **macOS**: today’s BS date, month navigation, AD ↔ BS conversion, and optional Apple Reminders.

> **Platform:** macOS only. Reminders integration uses Apple’s Reminders app (not available on Windows).

---

## Features

| Feature              | Description                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Today & calendar** | Current BS date (English + Devanagari), weekday, interactive month grid                                         |
| **Browse dates**     | Type a day number (e.g. `15`) to jump within the visible month                                                  |
| **Convert dates**    | AD → BS and BS → AD (`DD/MM/YYYY`)                                                                              |
| **Copy dates**       | Copy Nepali date strings to the clipboard                                                                       |
| **Set reminder**     | Create a dated reminder in the macOS **Reminders** app (requires Reminders)                                     |

---

## Requirements

- **macOS** with [Raycast](https://raycast.com)
- **Reminders** (for “Set Reminder” only)

---

## Usage tips

- **Dashboard** — Main calendar, convert date, set reminder; use `⌘` + arrow keys (actions) to change month, `⌘ T` for today.
- **Set Reminder** — `⌘ ⇧ R` on today or a selected day; pick time in `9:30 AM` style.

---

## Data & privacy

- **Calendar data** is computed locally from a BS lookup table (no account required).
- This extension does not include third-party analytics.

**Tithi** shown in the almanac section is approximate for display; do not rely on it for religious scheduling without a proper panchang source.

---

## Troubleshooting

| Issue                     | What to try                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Reminder failed           | Enable Reminders for Raycast in **System Settings → Privacy & Security**                             |

---

## License

Extension source is **MIT**
