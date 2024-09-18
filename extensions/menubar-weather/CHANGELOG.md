# Menubar Weather Changelog

## [Update icons] - 2024-09-02

- Update icons for Street and Country

## [Refactor Extension] - 2024-07-16

- Refactoring code to optimise extension performance
- Get latitude and longitude based on Swift API, support more fine-grained address
- Update extension icon

## [Fix icon] - 2024-06-02

- Fix Settings icon not showing in the menubar when using the Raycast icon style
- Invert latitude and longitude order in the menubar to match the convention

## [Update icons] - 2024-04-15

- Update icons
- Improve the implementation of SF Symbols icon style

## [Fix error] - 2024-02-05

- Fix json parsing errors
- Add dates as subheadings in weather forecasts

## [Add new weather icon] - 2023-08-21

- Now you can choose SF Symbols style weather icons, thanks to [Arttu](https://www.raycast.com/r22) for the SF Symbols icons

## [Add command subtitle] - 2023-07-24

- Now you can view the weather directly from the subtitle of the command.
- Fix the problem that the weather information is not updated properly after changing the settings

## [Add menubar info configutation] - 2023-07-11

- You can choose temperature type, UVI, pressure, humidity and rain to display in the menubar

## [Add UV Index] - 2023-07-03

- UV Index (UVI) is now included in the current weather and forecast
- UVI can be disabled in the Preferences

## [Fix bug] - 2023-06-19

- Fix a bug that caused the extension to crash if cached data couldn't be parsed properly

## [Update UI] - 2023-03-29

- Add wind direction display

## [Fix bug] - 2022-12-13

- Fix the bug of pop-up Toast error when refreshing in the background

## [Add Preferences] - 2022-12-01

- Add Preferences **Wind Speed Units**: Km/h, m/s, Mph, Knots

## [Fix bug] - 2022-11-26

- Fix the bug of crashing without network
- Add Preferences **Additional Info**: Whether to show sunrise and sunset, location and 7-day weather forecast

## [Add forecast] - 2022-11-24

- Add 7-day weather forecast
- Add screencast

## [Initial Version] - 2022-11-23

- Show current weather on the menu bar
