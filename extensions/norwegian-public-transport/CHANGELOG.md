# Raycast Norwegian Public Transport Changelog

## [Added trip search] - 2025-07-07

Added a new command for trip search 🚀 Supports searching for trips between two stop places, and viewing details for each leg of said trip. Thanks to [@binarybaba](https://github.com/binarybaba) for the contribution!

- Differentiates airport express transport modes
- Updated AtB Travel Planner links to point to production

## [Added configurable web planner] - 2024-10-30

- Added the option to configure web travel planners from four different counties in the extension preferences: Reis Nordland, FRAM (Møre og Romsdal), Svipper (Troms) and AtB (Trøndelag)

## [Tweaks for Store readyness] - 2024-05-04

- Changed the keyboard shortcut to add and remove favorites to ⌘⇧P, to match other Raycast extensions
- Added custom views for stop place and departure screens when there are no results

## [Release to Raycast Store] - 2024-05-04

Made the extension publicly available on the Raycast Store 🚀

## [Update command icon] - 2024-05-04

Added a bit more life to the command icon ✨

## [Preparing for store release] - 2024-04-29

This release has a bunch of minor changes and tweaks, mostly to make the extension ready for publishing

- Changed the extension name to "Norwegian Public Transport"
- Made it possible to navigate back to the stop place search page after opening a stop place
- Made info on mode of transport more readable, and made it possible to filter by this field
- Made search bar placeholders more descriptive, and replaced the clock
- Added a footer to the details section with credits to Entur
- ⌘O actions now point to Reis Nordland Travel Search instead of AtB

## [Added line favorites] - 2024-01-12

This update adds the option to add lines as favorites. Favorites are based on line number (also known as "public code"), and are separate for every quay / platform. Favorites will show in a section at the top of the list of departures, and are maked with a star icon. Favorites can be added with ⌘S, and removed with ⌘⇧S. This replaces the old shortcut for adding a stop as a favorite, which now only can be done on the stop place search page.

## [Added stop place search] - 2023-11-19

- Added a new landing page for searching for stop places
- Added option to save stop as favorite
- The AtB Travel Planner action now opens a specific service journey when used on the departure page
- Removed the Entur Vehicle Map action

## [Various improvements] - 2023-10-31

- Shows "via" information in line names
- Added filtering by authority
- Add action to open in AtB web planner (which is still in very early development)

## [Added stop selection after search] - 2023-09-09

This update makes it easier to get to stop places that doesn't always show up as the first result. If the first choice isn't right, you can pick a different one from up to 7 similar options in the right side drop down. Once you choose a different location, it will be remembered, and preselected the next time it appears in the list of results.

- Added option to pick related venues from dropdown
- Moved the selection of departure count to the action panel. It can now be increased by 5 by pressing the ⌘+ keybinding.
- Added a super secret `DEBUG_WIPE_STORAGE` command
- Rounded some rectangles

## [Added vehicle map and quay direction] - 2023-08-29

- Added link to view the live location of a departure
- Added direction to quays (Inbound/Outbound)
- Added keyboard shortcuts for actions (⌘S for skjer.men, and ⌘M from live location)

## [Updated details] - 2023-05-13

- Updated departure details to show upcoming stops
- Added clock to navigation title
- Added authority info, and action to open authority web page
- Added icon for coach

## [Added skjer.men integration] - 2023-05-11

- Added action to open stop place on skjer.men

## [Added Departures] - 2023-05-11

Initial version
