# Quick Event Extension for Raycast

Quick Event is an extension for [Raycast](https://www.raycast.com/) that provides a natural language way to add a new event to your calendars. Built using [Sherlock](https://github.com/neilgupta/Sherlock).

## Install Locally

Clone the project

```bash
  git clone https://github.com/mblode/raycast-quick-event.git
```

Go to the project directory

```bash
  cd raycast-quick-event
```

Install dependencies

```bash
  npm install
```

Build locally

```bash
  npm run dev
```

Finally open Raycast and use the command `Import Extension` then choose the cloned directory

## Extension Preferences

The `Your calendars` text field is _required_

- Specify your calendar or multiple calendars (comma separated)
- The calendar names can be found in the sidebar of Calendar.app
- E.g., "Personal,Work Calendar"

Optional Preferences:
- Checkbox - Focus on completion (i.e. open Calendar app on completion)

## Features

### Calendar Selection
Append `/calendarname` to quickly select which calendar to use:
- `Lunch with Sarah tomorrow at noon /work`
- `Dentist Friday 2pm /personal`
- `/w` matches "Work" if it's the only calendar starting with W (fuzzy matching)

### Time Ranges
Time ranges like `2-3pm` are now parsed correctly:
- `Piano tuning tomorrow 2-3pm`
- `Meeting 10-11:30am Friday`

### Timezone Support
Specify a timezone after the time:
- `Call with NYC team 3pm EST tomorrow`
- `Standup 9am PST Monday`

Supported: EST/EDT, CST/CDT, MST/MDT, PST/PDT, GMT/UTC, CET/CEST, JST, AEST/AEDT, and more.

### Smart Date Handling
- Past dates automatically advance to next year (e.g., "Dec 18" in late December → Dec 18 next year)

## Create Event Examples

- `Team lunch tomorrow 12-1pm /work`
- `Flight to NYC Friday 3pm EST`
- February 24 at 3pm - 2pm March 3
- Vacation is in 4 weeks...
- Christmas is on December 25th.
- Homework 5 due next monday at 3pm
- Let's have lunch on the 3rd.
- The retreat is from Jan 12 - 29.
- Bake a cake tomorrow.

## Author

**Matthew Blode** (mblode)

- [GitHub](https://www.github.com/mblode)
- [Portfolio](https://matthewblode.com)

## Related Projects

- [Sherlock](https://github.com/neilgupta/Sherlock)
- [Chrono](https://github.com/wanasit/chrono)
- [Calfred](https://github.com/ruggi/calfred)
- [Fantastically Good Event Parser](https://polymaths.blog/2018/06/fantastically-good-event-parser-for-drafts-5)
- [Fantastical](https://flexibits.com/fantastical)
