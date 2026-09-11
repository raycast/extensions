# Windows Environment Variables

## [Initial Version] - 2026-04-02

### Added

- **List Environment Variables** command: browse, search, copy, edit, and delete Windows environment variables (User and System scopes)
- **Edit PATH Variable** command: view, add, remove, and reorder PATH entries with existence validation
- **Add Environment Variable** command: create new user or system environment variables
- Automatic `WM_SETTINGCHANGE` broadcast after every modification so running applications pick up changes immediately
- PATH backup to LocalStorage before each modification
- Protected variable detection (cannot delete PATH, COMSPEC, SYSTEMROOT, etc.)
- Sensitive variable masking (API keys, tokens, passwords)
- UAC elevation support for System-scope variables
- Duplicate path detection (case and slash insensitive)
- Copy as `set NAME=VALUE` for command-line use
- Quick access to Windows System Environment Variables dialog
