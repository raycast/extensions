# Local Holidays

A Raycast extension that displays upcoming holidays from a local JSON file.

## Setup

Create the following file on your machine:

~/.raycast_extensions/holidays.json

Example format:

```json
[
  { "date": "2026-01-01", "name": "New Year Holiday", "flexi": false },
  { "date": "2026-01-15", "name": "Makara Sankranti / Pongal", "flexi": true }
]
```

## Behavior

Shows all holidays from today onwards

Groups holidays by month

Normal holidays are shown with a green check icon

Flexi holidays are shown with a blue circle icon

## Notes

No holiday data is bundled with the extension

The extension reads from the local filesystem

No network access is used