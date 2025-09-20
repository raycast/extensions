# Logseq Changelog

## [Windows support] - {PR_MERGE_DATE}

- Added Windows support

## [Add command for adding tasks] 2024-06-03

- Add tasks using the new "Add task" command

## [Use leading spaces for nesting] 2023-02-06

- Write nested notes from the quick notes box
- Nesting uses `*` in org mode files
- Removes ramda dependency

## [Fix search] - 2023-06-06

- Fix protocol change in Logseq in the search functionality [Issue](https://github.com/raycast/extensions/issues/5415)

## [Support for org files] - 2022-10-14

Add org files support for LogSearch by fetching preferred format from Logseq config

## [Fix] - 20220-10-10
- Fix Date incorrect for journals setup with EEEE for day name [Issue](https://github.com/raycast/extensions/issues/3033)

## [Support insert leading time and quick capture tag when using quick note] - 2022-07-27
- Add support for insert leading time and quick capture tag when using quick note just like logseq on mobile.
- Disabled by default, enable it in the extension settings.

## [Support org mode & custom journal folder name] - 2022-04-15

- Support org mode!
- Users can config the custom journal location in logseq using `:journals-directory "your-directory"`, this PR covers this config

## [Support custom journal format] - 2022-04-11

In logseq, users can edit the config.edn file and use :journal/file-name-format "yyyy-MM-dd" to specify the date format of the file, the extension will parse this config from the `config.edn` file.

## [Initial Version] - 2022-04-07

Insert your notes to logseq quickly!
