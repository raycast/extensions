# Commit Message Formatter Changelog

## [Upgrade Commit Message Formatter] - 2024-10-11
- 🐛 fix: disable agent when input is empty
- 🐛 fix: fix crash when no text is selected or copied

## [Upgrade Commit Message Formatter] - 2024-10-10
- ♻️ refactor: remove unused code and use raycast-env.d.ts

## [Upgrade Commit Message Formatter] - 2024-10-04
- ✨ feat: support displaying multiple candidate commit messages on the search page

## [Upgrade Commit Message Formatter] - 2024-10-03
- 🔧 chore: change project name to commit-message-formatter

## [Upgrade Commit Message Formatter] - 2024-10-01

- 👷 ci: improve publish workflow
- 🔧 chore: rename gitmoji-llm to gitmoji-commit

## [Upgrade Commit Message Formatter] - 2024-09-20

- ⚡ perf: optimize prompts

## [Upgrade Commit Message Formatter] - 2024-09-18

- ⚡ perf: improve stability and add completion message for message generation command agent
- ⚡ perf: optimize prompts

## [Upgrade Commit Message Formatter] - 2024-09-14

- ♻️ refactor: use structured approach to generate commit message type
- ✨ feat: add generating animation when generating commit message

## [Upgrade Commit Message Formatter] - 2024-09-11

- ✨ feat: add publish action
- ✨ feat: add mechanism to generate package-lock.json in action
- 🐛 fix: resolve issue with node_modules directory not existing in path in action
- 🐛 fix: resolve issue with upload-artifact name
- ✨ feat: optimize publish action to support automatic submission PR
- 🐛 fix: correct git reset command usage
- 🐛 fix: add push-to-fork parameter in create-pull-request to fix action issue
- 🐛 fix: correct DESCRIPTION and SCREENCAST in publish action
- ♻️ refactor: use file to pass pr body instead of description and screencast environment variables
- 🐛 fix: fix token not passed in create-pull-request
- 🐛 fix: remove manual checkout for create-pull-request to correctly identify base
- 🐛 fix: fix commit-message and pr title
- 🔧 chore: remove bun.lockb and yarn.lock from source code

## [Upgrade Commit Message Formatter] - 2024-09-10

- ✨ feat: support custom language
- ♻️ refactor: move all files to root directory

## [Upgrade Commit Message Formatter] - 2024-09-08

- ✨ feat: support custom models
- ✨ feat: switch to using function calling
- 🔧 chore: format code styling
- ✨ feat: support copy and paste actions
- 🔧 chore: upgrade typescript to 5.5.4

## [Upgrade Commit Message Formatter] - 2024-09-08

- ✨ feat: use openai's native package instead of raycast's built-in ai

## [Upgrade Commit Message Formatter] - 2024-09-08

- ⚡ perf: optimize prompt

## [Upgrade Commit Message Formatter] - 2024-09-08

- ♻️ refactor: extract common code into separate files

## [Upgrade Commit Message Formatter] - 2024-09-08

- ✨ feat: add gitmoji-llm command for generating commit messages

## [Upgrade Commit Message Formatter] - 2024-09-07

- ✨ feat: add `🎉:tada:` to the list of gitmojis

## [Add Commit Message Formatter Extension] - 2024-09-07

- Add initial version of the Commit Message Formatter extension
