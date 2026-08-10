# Storyblok Changelog

## [Paginated Assets + `sbData` Enhancements] - 2024-10-31

- Show `Detail` if unable to load data in `Space Details`
- Modified `sbData` so it takes generic type which prevents us from having to _explicity cast_ using `as`
- Fix `Copy Story ID` action in `Stories List` having wrong Title
- `useStoryblokDataPaginated` hook allows to view >100 assets at a time in `Assets`
- Fix `Open ... JSON` commands in `Story Detail`

## [Added new regions] - 2024-06-05

- Added Australia as an API region
- Added China as an API region
- Changed the "Europe" label to "European Union" 

## [Initial Version] - 2024-04-01

- Initial Submission
- Includes a single "Spaces" command, with many child commands like access to Stories, Assets, Collaborators, and more