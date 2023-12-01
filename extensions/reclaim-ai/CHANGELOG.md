# reclaim Changelog

## [Fixes] - 2023-11-29

- Fix duration string parsing so that task durations work correctly in more cases (RAI-9438)
- Respect the user's preferred default task due date and start after date (RAI-10338)
- Fix the URL for creating one-off scheduling links (RAI-11312)

## [Update] - 2023-11-22
- Data Fetching Refactor: Replaced custom `axios` + `useState` + `useEffect` fetching logic with `useFetch` from `@raycast/utils` for improved caching and faster FCP.
- Improved Hook Architecture: Encapsulated fetching logic within respective custom hooks for better code organization and maintainability.

## [Update] - 2023-11-21
- Menubar Update: Reverted logic to build `/next/moment` response in code, now utilizing endpoint support for events from all calendars.
- Join Meeting Enhancement: Added checks to handle events without a `meetingUrl`. For synced events, the function now fetches the original event to obtain and use its `meetingUrl`.

## [Update] - 2023-11-20
- Limit contributors to reclaim staff, nothing changed in the code. 

## [Fix] - 2023-11-13

- Create task is now using the default task visibility rather than always private


## [Update] - 2023-11-07

- Introduce new functionality to filter out synchronized events managed by Reclaim that are part of multiple calendars.

## [Update] - 2023-11-02

- Changed task filter to 'Archived' only
- Changed order of task status

## [Update] - 2023-10-31

- Refactor of Event Fetching Process
- Bug Fix in the Menu Bar Component

## [Update] - 2023-10-24

- Revert filter logic
- New prioritization features
- Bug fixes

## [Update] - 2023-10-11

- Show All Connected Calendar Events: Updated the system to display events from all calendars connected via Reclaim.
- Duplicate Event Filtering: Noticed that using the Reclaim calendar sync across multiple calendars sometimes results in duplicate events. Implemented a simple filter logic to weed out these duplicates and ensure a cleaner event display.

## [Update] - 2023-09-02

**My Calendar**

- Added new action `Reschedule`.

**Search Tasks**

- Added action `Mark incomplete` to archived tasks.
- Added option 'Add 15min' to `Add Time` action.

## [New Command] - 2023-08-10

- Added new `Search Tasks` command.

## [Update] - 2023-08-02

- Added filter to remove declined events in MenuBar.
- Added new `Joing Meeting` command.

## [Update] - 2023-07-25

- Updated keywords and README.

## [Improve time policy selector and rename extension] - 2023-07-17

- Changed the extension name from `reclaim` to `reclaim-ai`.
- Updated the time policy selector (hours) in the task creation form.

## [Initial Version] - 2023-06-06
