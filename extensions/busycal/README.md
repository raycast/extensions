# BusyCal

BusyCal for Raycast brings BusyCal's local automation into Raycast so you can create events and tasks, search your schedule, and find free time without leaving the keyboard.

## Requirements

- BusyCal 2026.1.3 or later
- Raycast on macOS
- BusyCal installed in `/Applications` or `~/Applications`
- Raycast allowed to control BusyCal when macOS prompts for Automation access

If both the direct-download and Setapp editions of BusyCal are installed, open the edition you want Raycast to control before running a command.

## Commands

- `Create Event`
  - Create a structured BusyCal event with title, calendar, dates, location, and notes.
- `Create Task`
  - Create a structured BusyCal task with an optional due date and notes.
- `Quick Add Event`
  - Send natural-language event text to BusyCal's parser for immediate creation.
- `Quick Add Task`
  - Send natural-language task text to BusyCal's parser for immediate creation.
- `Search Items`
  - Search BusyCal events and tasks, then reveal the selected item in BusyCal.
- `Upcoming Items`
  - Review upcoming BusyCal events and tasks for the configured horizon.
- `Find Next Available Time`
  - Ask BusyCal for the next free slot, then copy it, open BusyCal on that date, or create an event in that slot.

## Examples

- `Quick Add Event`: `Lunch with Sam tomorrow at 1pm /Work`
- `Quick Add Task`: `Finish expense report Friday /Personal`
- `Search Items`: `offsite`
- `Find Next Available Time`: choose `30 minutes` and optionally limit the search to one calendar

## How It Works

- Quick Add commands call BusyCal's natural-language automation command.
- Structured create, search, upcoming, availability, and reveal commands use BusyCal's AppleScript automation commands.
- All automation stays local on your Mac.

## Privacy

The extension talks directly to BusyCal on your Mac. It does not send your calendar or task data to external servers.

## Support

- Documentation: <https://www.busymac.com/docs/busycal/70624-raycast>
- Issues: <https://github.com/BeehiveInnovations/busycal-raycast/issues>

## License

MIT. Copyright (c) 2026 Beehive Innovations FZE.
