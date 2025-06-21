# Google Meet Changelog

## [New Command] - {PR_MERGE_DATE}
- 

## [Improvement] - 2024-10-22

- Add delay before reading meeting URL from browser

## [Improvement] - 2024-07-19

- Change the way to get the URL in some Chromium-based browsers

## [Improvement] - 2024-05-29

- Change the way to get the URL in Arc Browser

## [Bug fix] - 2024-01-05

- Open Arc's location bar before attempting to copy the URL

## [New Preference] - 2023-07-31

- Now it's possible to select a preferred browser, meaning that if you have multiple browsers and want to customize whether it opens on default application or a custom. By default it will always open with the default browser, but you can now override the value on preferences. Don't forget to only choose valid browsers.

FYI: For some reason, as of now, Vivaldi is not being able to be selected, even thought is a valid browser

## [Bug fix] - 2023-07-29

- Sometimes when trying to copy from a browser it didn't copy and also got stuck on `Creating meet...` on Raycast, specially on Firefox and Firefox Developer Edition.
- Copy url now works on Arc Browser as expected. It's also good to point out that it uses the native and default way to copy the URL from the browser using the `cmd + shift + c` combination, for now it only will work with this combination since it's the default one and should be the most used accross users.

## [New Commands] - 2022-10-21

Now it's possible to create multiple profiles and select one of them to start a new google meet call

## [New Additions] - 2022-09-07

When the meet is created, it will copy the generated url to the clipboard. (Not all browsers are supported)

## [Added Google Meet] - 2022-03-06

Initial version code
