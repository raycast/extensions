# GitLab Changelog

## [Custom Certs] - 2022-06-23
- Add support for custom certificates
- Add support for ignoring SSL errors

## [Projects list] - 2022-05-18
- Display project stars only if there are ([#1728](https://github.com/raycast/extensions/pull/1728))

## [Optimize] - 2022-04-03
- Set minimum Raycast version to `1.31`
- Increase project cache invalid time to `7` days
- Most commands use SWR cache to speedup operations
- Add Primary Action option to settings
- Add pop to root setting
- Add more details for issue and merge request
- Add `My Recent Commits` root command
- Merge requests and issue view can now be directly opened from `My Recent Activities` root command
- Fix relative markdown links to display images which get uploaded to GitLab directly
- Filter `My Merge Request`, `My Todos`, `My Recent Commits`, `My Open Issues`, `My Reviews` per project via CMD + P
- Most commands show CI Job status now if available
