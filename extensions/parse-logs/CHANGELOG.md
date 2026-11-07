# Parse Logs Changelog

## [Regex Search, Large Files and Fixes] - {PR_MERGE_DATE}

- Search with a regular expression as well as plain text, with optional case-sensitive matching
- Optionally prefix each saved line with its line number in the original log
- Pick the log file from a list of the folder's files, newest first, with age and size
- Add an optional Output Folder preference, and save to Downloads when the log's folder can't be written to
- Read logs line by line so large files no longer have to fit in memory, and preview the first 500 matches
- Fix the next run parsing the previous run's results instead of the newest log
- Fix Windows line endings leaving a stray character at the end of every saved line
- Fix the preview breaking when a log line contains three backticks
- Skip folders and follow symlinks when looking for log files
- Show a clear message when nothing matches instead of an error
- New icon

## [Initial Version] - 2025-08-07
