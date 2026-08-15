# Xcode Changelog

## [Xcode 26 Assets] - 2025-09-15

- Updated assets to match Xcode 26 

## [AI Tools & Improved Search Recent Projects] - 2025-06-16

- Added AI tools to search for your recent Xcode projects, Swift packages, boot and shutdown simulators, and more.
- Improved the "Search Recent Projects" command to sort the most recent projects by their last usage.
- Added an option to select the Swift version when creating a playground.
- Removed the "Search Apple Developer Documentation" command due to the unavailability of the underlying API.
- Added "Open With Terminal" action to the "Search Recent Projects" command.
- Added "Create Quicklink" action to the "Search Recent Projects" command.
- Added "Delete" action to the "Manage Simulators" command.
- Updated Raycast Store screenshots.

## [Fix open URL] - 2025-04-25

- Fix the open URL in Simulator command to support URLs with query parameters.

## [Add Xcode Runtimes Management] - 2025-04-15

- Add Xcode runtimes listing and management command
- Add a delete unsupported Xcode runtimes command

## [Added Delete App Data] - 2024-09-30

- Added delete app data command to remove the data of an app installed on a simulator without uninstalling.

## [Search Recent Projects Improvements] - 2024-09-20

- Improved the "Search Recent Projects" command to remember the last filter option

## [Clear SwiftUI Previews Cache] - 2024-04-03

- Added "Clear SwiftUI Previews Cache" command to remove the ~/Library/Developer/Xcode/UserData/Previews directory
- Improved "Clear Swift Package Manager Cache" command

## [Maintenance Update] - 2024-01-10

- Removed "Search Swift Package Index" command due to the unavailability of the underlying API

## [Maintenance Update] - 2023-10-28

- Added an option to open the App Group directory from the "Show Recent Builds in Menu Bar"
- Added missing Xcode 15 icon when searching for Xcode releases

## [Updates to Simulator and Recent Builds] - 2023-10-07

- Added Restart Simulator
- Added Rename Simulator
- Added Push Notifications using a payload
- Added iCloud Sync
- Added Open AppGroup directory

## [Updated Swift Package Types] - 2023-10-03

- Updated Swift Package types when creating a new Swift Package.

## [Xcode Project List] - 2023-08-15

- The favorites section will always be shown at first in the "Search Recent Projects" command.

## [Xcode 15 Beta Icon] - 2023-07-28

- Added Xcode 15 Beta icon when searching for Xcode releases.

## [Change Data Source for List Apple Devices] - 2023-07-28

- Changed the data source for the "List Apple Devices" command so it doesn't rely on a text file anymore.

## [List Apple Devices] - 2023-07-25

- Added "List Apple Devices" command to have a list of Apple devices and their matching product name/code name.

## [Filtering Simulators on State with Dropdown] - 2023-07-02

- Added a dropdown in simulators list to filter simulators on the boot state.

## [Bug Fix] - 2023-06-21

- Fixed a bug where creating a Swift playground failed due to an incorrect date format.

## [Bug Fix] - 2023-02-26

- Fixed a bug where the URL to an Apple's developer documentation entry wasn't constructed correctly.

## [Open URLs in the iOS Simulator] - 2023-02-03

- Added “Open URL in Simulator” command to open URLs such as deeplinks in the iOS Simulator.

## [Bug Fix] - 2023-02-03

- Fixed a bug where the URL to Apple's developer documentation wasn't created correctly.

## [Bug Fix] - 2023-02-01

- Fixed a bug where the URL of a Swift package wasn't created correctly.

## [Recent Builds Performance Improvements] - 2023-01-24

- Improved the performance of the "Search Recent Builds" and "Show Recent Builds in Menu Bar" command.

## [Code Snippets] - 2023-01-02

- Added "Create Code Snippet" command to create a new Xcode Code Snippet.
- Added "Search Code Snippets" command to search and edit your Xcode Code Snippets.

## [Search Recent Builds Menu Bar] - 2022-11-29

- Added "Show Recent Builds in Menu Bar" command to view the latest builds of your apps installed on a simulator.
- Improved layout and actions of the "Search Recent Builds" command.

## [Open Developer Documentation] - 2022-11-07

- Added "Open Developer Documentation" command to open the Developer Documentation in Xcode.
- Improved the layout of lists via detail views to show more information.
- Renamed the "Installed Simulator Apps" command to "Search Recent Builds".
- Added a launch action to the "Search Recent Builds" list.
- A left click on a menu bar entry of the "Show Recent Projects in Menu Bar" command now opens the corresponding directory in the finder.

## [Delete DerivedData Script] - 2022-11-04

- Added a script to delete DerivedData via Finder instead of the `rm` command. This way apps that are going to be deleted will be deregistered from Launch Services.

## [Menu Bar Project Favorites] - 2022-10-14

- Added an option to show Xcode Project favorites in the menu bar.

## [Confirmation Alerts] - 2022-10-05

- Added confirmation alerts to "Clear Derived Data", "Clear Swift Package Manager Cache" and "Delete Unsupported Simulators" commands.

## [Search Swift Package Index] - 2022-09-02

- Added "Search Swift Package Index" command to search the Swift Package Index and easily add a Swift Package to a Xcode Project.

## [Project Favorites & Swift Package Dependencies] - 2022-08-25

- Added option to add Xcode Projects to favorites
- Added "Show Swift Package Dependencies" command to view the Swift Package dependencies of a Xcode Project

## [Menu Bar] - 2022-08-17

- Added "Show Recent Projects in Menu Bar" command to view and open your recent Xcode Projects from the menu bar
- Added search bar accessory to "Search Recent Projects" command to filter the results based on the project type

## [Maintenance Update] - 2022-08-09

- Updated to latest Raycast API
- Improved components

## [Open Project Fix] - 2022-04-26

- Always open Xcode Project, Workspace or Swift Package with Xcode

## [Maintenance Update] - 2022-04-23

- Migrated to latest Raycast API
- Added Screenshots

## [Initial Version] - 2021-10-15

- Added Xcode Raycast Extension
