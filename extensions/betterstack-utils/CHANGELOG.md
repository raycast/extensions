# betterstack-utils Changelog

## [Bugfixes, Monitors and status pages] - 2026-10-03

- Fixed incident creation failing with a `422 Unprocessable Entity` error for API tokens with access to multiple
  teams by sending the **Team Id** preference along with the request.
- Improved BetterStack API error messages to include the validation details returned by the API instead of just the
  HTTP status code.
- Fixed the on-call schedule losing its live pulse animation on the stable release of Raycast v2, which was being
  rasterized to PNG like Raycast v1.
- Added a **Monitors** command to view your BetterStack monitors, see availability and status details, and open them
  in the browser.
- Added a **Status Pages** command to view your BetterStack status pages, their sections and resources, and open
  them in the browser.

## [Bugfix] - 2026-07-06

- Fixed an issue where light themes were not displaying the schedule grid colors and borders properly.
- Fixed the weekend rendering as a solid black block by replacing Satori's `repeating-linear-gradient`
  output with a different SVG pattern.
- Fixed on-call bars rendering with a black fill on Raycast v1 by rasterizing the schedule to PNG instead of embedding
  raw SVG. Raycast v2 (beta) keeps the SVG rendering path, so the live pulse animation still works there.
- Fixed inconsistent borders between week rows in the monthly schedule grid, caused by adjacent weeks drawing
  overlapping or mismatched border segments at out-of-month day boundaries.

## [Schedule improvements] - 2026-06-30

- Added a **Refresh** action to the on-call schedule.
- Added icons to all actions across the extension.

## [Incident management] - 2026-06-30

- Added a **Create Incident** command to file new BetterStack incidents with summary, description, requester email, and
  email/SMS/call notification preferences.
- Added an **Incidents** command to list active incidents with acknowledge, resolve, open in browser, and refresh
  actions.
- Added an optional **Requester Email** preference to pre-fill the requester email when creating incidents.

## [Open BetterStack in browser] - 2026-06-30

- Added an **Open Schedule in Browser** action to open the BetterStack on-call schedule from Raycast.
- Added an optional **Team Id** setting used to build the BetterStack schedule URL.

## [Initial version] - 2026-06-09

- Initial version of the better stack utils Raycast extension
