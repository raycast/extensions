# Jetbrains Changelog

## [Better open when closed, MenuBarExtra and more] - 2022-09-11

- Added workaround for environment variable issues when opening a closed Application
  - Tries to finds the correct tool in the Application Support folder 
  - Uses Raycast `open` to open with the parent's environment variables
  - Uses sleep to give script time to work
- Added new MenuBarExtra
- Added check for `.settings.json` file to auto determine scripts dir 
- Fixed issues opening apps when scripts path contains a space 
- Improved help for missing scripts
- Updated to latest api version

 ## [Update] - 2022-06-11

Improve keywords to match dashes and low-dashes when searching
