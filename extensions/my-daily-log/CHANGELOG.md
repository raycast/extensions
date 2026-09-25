# my-daily-log Changelog

## [Local AI, Reminders and Timezone Fixes] - {PR_MERGE_DATE}

- The AI commands no longer use Raycast AI: they work with Ollama (default) or any OpenAI-compatible server (LM Studio, llama.cpp, OpenAI, OpenRouter…), configurable in the preferences
- Added "AI Thinking" (e.g. disable thinking for qwen3 like `--think=false`) and "Extra Model Parameters" preferences to pass any parameter (temperature, top_p, seed…) to the model
- AI summaries are now generated on demand, can be regenerated and copied, and show a helpful message when the AI server is not reachable
- Fixed logs showing up on the wrong day ("always a day behind", logs after midnight counted as yesterday) by storing them by local date instead of UTC. Existing logs are migrated automatically and backed up
- Fixed times displayed as `24:35` and dates displayed off by one in "Logged Days of Month"
- Fixed "Summary of a Month" skipping the 31st and including the last day of the previous month
- Errors (unreadable folder, invalid log files) are now shown instead of failing silently
- Added deleting logs and changing the date/time of a log, including logging something on a previous day
- Added copying/pasting a day's logs as Markdown from every list
- Added navigation between days (`⌘ [` / `⌘ ]`) in "My Daily Log", and weekday/number shortcuts for its date argument
- Added the "Search Logs" command
- Added the "Log Reminder" menu bar command, reminding you to log on a configurable interval during your working hours
- Added the "Summary of a Week" command to generate weekly reports

## [Fixes] - 2023-09-08

- Fixed a bug where if the folder for logs did not exist, the extension would crash

## [Update] - 2023-03-31

- Added new Daily Summary report command using RaycastAI
- Added new Daily Standup Speech command using RaycastAI
- Added new Summery of a Month report command using RaycastAI

- Fixed a bug where the date was being formatted incorrectly for display in the list of logs

## [Update] - 2022-12-23

- Added support for Editing Daily Logs

## [Initial Version] - 2022-11-14
