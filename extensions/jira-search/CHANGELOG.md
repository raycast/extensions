# Jira Search Changelog

## [Fixes] - {PR_MERGE_DATE}

- Fixed issue search to work again

## [Update] - 2023-05-16

- Show board type in board search
- Fixed board search for boards without location ([#6561](https://github.com/raycast/extensions/issues/6561))

## [Update] - 2023-03-22

- Support searching by assignee using `~username` syntax
- Ensure issue is opened by issue key, when user quickly enters an issue key like `PRJ-1234` and hits `Enter` before a preview of the matching issue is available ([#5216](https://github.com/raycast/extensions/issues/5216))
- Avoid results of older query to override result of latest query in case of racing conditions ([#5217](https://github.com/raycast/extensions/issues/5217))
- Fixed invalid query when no filter from the dropdown is selected ([#4465](https://github.com/raycast/extensions/issues/4465))

## [Update] - 2023-01-16 

 - Added a filter option in the Search Issues page.