# GitHub Gist Changelog

## [Update GitHub Gist] - 2025-02-02

- Add a new preference to set the default gist tag.

## [Reduce GitHub Authentication] - 2024-07-16

- Reduce GitHub authentication permissions to access only GitHub Gist content
- Fix the issue of **Open in Ray.so** command displaying garbled code
- Add new Action: Save as Quicklink

## [OAuth2.0 Support] - 2024-07-11

- Uses Raycast OAuth2.0 GitHub integration with `repo read:user gist` scopes.
- ⚠️Disables the personal access token preference. Users can delete their tokens after successful OAuth2.0 connection.
- Minor refactoring and updated dependencies.

## [Refactor Command] - 2024-07-03

- Simplify the code and improve performance
- Use useForm to optimise performance
- Support saving gist as snippets

## [Add Copy Raw Link action] - 2023-11-09

- Add action to copy the raw link of the gist file

## [Update] - 2023-07-26

- Updated dependencies

## [Update] - 2023-04-12

- Updated dependencies
- Enable syntax highlighting

## [Update] - 2023-04-12

- Updated dependencies

## [Optimize extension] - 2022-09-30

- Optimize Search Gists command loading speed

## [Delete Gist action optimization] - 2022-07-04

- Optimize delete Gist action: a warning will pop up to prompt the user to confirm before deleting the gist
- Update toast text

## [Add "Load More"] - 2022-05-15

- Update settings item: you can choose the number(30-100) of Gist loaded per page.
- Add "Load More": When you select the last item in the list, the next page of Gist will be loaded automatically.
- Add "Open in Ray.so" action: Create beautiful images of your gist code using ray.so.

## [Fix Markdown Preview bug] - 2022-04-18

- Fix Markdown files are not previewed correctly (fix: [#1331](https://github.com/raycast/extensions/issues/1331)).

## [Add Image Support] - 2022-04-08

- Add Image support (fix: [#1326](https://github.com/raycast/extensions/issues/1326)).

## [Update GitHub Gist] - 2022-04-08

- Release of GitHub Gist version 1.1
- Add new action for **Search Gist** command, you can use ⌘+N to create a new gist.
- Fix text error.
- Fix the bug that Gist files cannot be deleted and file names cannot be modified when updating Gist.

## [Added GitHub Gist] - 2022-04-08

- Release of GitHub Gist version 1.0
- **Create Gist**: Create gists on GitHub.
- **Search Gist**: Search and display gists from GitHub.
