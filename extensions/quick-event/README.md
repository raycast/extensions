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

## Create Event Examples

- February 24 at 3pm - 2pm March 3
- Vacation is in 4 weeks...
- Christmas is on December 25th.
- Homework 5 due next monday at 3pm
- Let's have lunch on the 3rd.
- The retreat is from Jan 12 - 29.
- Bake a cake tomorrow.
- Use Tabule today!

## Timezone Support

Specify a timezone in your query and the event time will be converted to your local timezone automatically. The original timezone time is shown in the subtitle for reference.

### Supported Timezone Abbreviations

**US:** ET, EST, EDT, CT, CST, CDT, MT, MST, MDT, PT, PST, PDT, AKST, AKDT, HST, HDT

**Europe:** GMT, UTC, BST, CET, CEST, EET, EEST, WET, WEST, MSK, TRT

**Asia/Pacific:** IST, JST, KST, SGT, HKT, PHT, ICT, WIB, GST, PKT, AEST, AEDT, ACST, ACDT, AWST, NZST, NZDT

**Explicit Offsets:** GMT-1, GMT+5, UTC-3, UTC+5:30, etc.

### Timezone Examples

- Meeting at 3pm ET
- Call at 10am CT tomorrow
- Sync at 9am PT on Friday
- Lunch at noon GMT-1
- Standup at 8am GMT+5:30
- Review at 2pm JST next Monday
- Demo at 4pm CET

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
