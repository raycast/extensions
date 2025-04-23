# Swift Command Changelog

## [Initial Version] - 2024-09-11

## [Add Import Alias Command] - {PR_MERGE_DATE}

### Added

- New command to import aliases from shell configuration files
- Support for importing from .zshrc, .bashrc, and fish config files
- Ability to select and import specific aliases
- Description support from shell comments (using `# man:` prefix)
- Automatic argument detection for imported commands
- Option to skip specific aliases using `hideraycast` keyword
