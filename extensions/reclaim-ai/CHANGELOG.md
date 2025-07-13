# reclaim Changelog

## [Update] - 2025-06-04
- Update to the package.json description to include Outlook as a valid calendar provider.

## [Fixes] - 2025-04-02
- Don't split surrogate pairs

## [Fixes] - 2024-10-25
- Don't hardcode task category to "work"

## [Update] - 2024-10-16
- Add Sentry support

## [Fixes] - 2024-10-15
- Don't cache moment data, should always be up to date

## [Update] - 2024-10-14
- Add the `Show Now Event in Menu Bar` configuration option for the Calendar menu bar

## [Fixes] - 2024-09-05
- Route useFetch through useApi

## [Fixes] - 2024-09-04
- Break out separate components and hook for Scheduling Links

## [Fixes] - 2024-09-03
- Replace axios with node-fetch

## [Fixes] - 2024-08-23
- Stopped rapid-fire calls to `GET:/api/smart-habits`
    - New hook `useSyncCachedPromise`
        - Only fires promise if previous fun is done
        - Works when multiple components mount at the same time

## [Fixes] - 2024-08-23
- Fix state management now we are using useFetch

## [Fixes] - 2024-08-21
- Add useCallbackSafeRef hook
- Fix component wrapping that was causing UI glitch

## [Fixes] - 2024-08-19
- Fix useTask return type
- Separate state and actions in hooks
- Break out subcomponents in my-calendar & notications

## [Fixes] - 2024-08-19
- Correct typings in `normalize` function so that they pass `tsconfig:strict`

## [Fixes] - 2024-08-16
- Handle possibly undefined

## [Update] - 2024-08-13
- Update contributors list
- Just strip planner emojis
- Have smart habit actions respect unscheduleRestartedOverride setting
- Fail useFetch API calls silently

## [Update] - 2024-07-30
- Add actions for Smart Meetings & Habits 2.0
- Parity between Raycast actions and Omnibar Actions
- Fix "reschedule event" to work for Tasks and use new endpoint
- Tasks/smart habits start/stop/restart respect auto reschedule setting
- Sort Time Schemes in Create Task form
- Rewrite useEvent and useMoment hooks to not be fetches inside callbacks inside hooks

## [Update] - 2024-05-10
- Cache the user object for 30 minute for a small performance benefit.

## [Fixes] - 2024-02-17
- Fix task form so that it honors user preferences for the Up Next and Visibility task settings. 

## [Update] - 2024-02-07
- Resolves issue of updating task priority to "low priority"
- Displays a warning icon in the task list if a task is "at risk".
- Implemented optimistic updates for listed tasks.
- Added new "Send to Up Next" action for tasks.
- Simplified the task update process.

## [Fixes] - 2024-01-31
- Removed top-level Join Meeting command, deferring instead to My Calendar → Choose Event → Join meeting.

## [Fixes] - 2024-01-27
- Misspelling fixes.

## [Update] - 2024-01-18
- Menu bar update for start / stop of habits: when starting or stopping a habit, the extension will now display a HUD giving the user immediate feedback that their action was successful. 

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
