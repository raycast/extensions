# Shell History Changelog

## [Enhancements] - 2025-09-02

- Add an option to change the display order of the shell history.

## [Fix Error] - 2025-04-29

- Fix the problem of not finding the path to the ZSH and Bash history files
- Optimize command execution logic in terminals such as Warp

## [Respect HISTFILE] - 2025-01-19

- Support [Ghostty](https://ghostty.org) Terminal app
- Refactor keybinding of running in terminal
- Automatically retrieves the path to the Shell's history file, and will use the user-defined path if the user has customized the HISTFILE.

## [Fix Display Error] - 2024-09-30

- New Setting: `History Timestamp` to fix the display error of Zsh history

## [Auto Close Window] - 2024-07-11

- Automatically close window after performing an action
- Add a new configuration option to enable/disable show tips

## [Show Detail] - 2024-07-04

- Show detail of a command history
- Fix multi line command history search

## [Initial Version] - 2024-06-28

- Search shell command history
