# betterstack-utils Changelog

## [Bugfix] - {PR_MERGE_DATE}

- Fixed an issue where light themes were not displaying the schedule grid colors and borders properly.
- Fixed the weekend hatch pattern rendering as a solid black block by replacing Satori's `repeating-linear-gradient`
  output with a hand-rolled SVG pattern.
- Fixed on-call bars rendering with a black fill on Raycast v1 by rasterizing the schedule to PNG instead of embedding
  raw SVG. Raycast v2 (beta) keeps the SVG rendering path, so the live pulse animation still works there.

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
