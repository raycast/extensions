# Vitra for Raycast

See where your day stands — readiness, sleep and recovery from your Oura ring —
without leaving Raycast.

## What it does

Shows today's readiness, sleep and activity scores, last night's sleep, HRV,
resting heart rate, body temperature and blood oxygen, each against your own
30-day baseline.

## Requirements

The [Vitra](https://vitrahealth.app) desktop app, connected to an Oura ring.
Vitra publishes a small read-only file on your machine; this extension reads it.
If nothing appears, open Vitra and leave it running for a minute.

## Privacy

This extension makes **no network calls**. It reads one JSON file that Vitra
writes inside its own application-support folder, and nothing else — not the
database, not Vitra's local API. Your health data does not leave your machine,
which is the point of Vitra in the first place.

## Notes

- **Scores can be hidden.** Vitra can hold scores back until you have rated the
  day yourself, so the rating is not coloured by the number. When that setting
  is on, this extension says so instead of showing the scores.
- **Paced hearts.** If you have told Vitra your heart rate is set by a device or
  medication, HRV and resting heart rate appear without comparison or verdict.
