# Jetbrains Changelog

## [Toolbox 2.0 Updates] - 2023-07-22

- Post release 2.0 fixes
- General fixes for different installation paths
- Icon fixes
- Handle apps that don't work properly
- Handle apps that are broken by 2.0 installation

## [Rider tweak] - 2023-07-22

- Small tweak for Rider on Toolbox 2.0

## [JetBrains Toolbox 2.0 Support] - 2023-07-04

- Update to support new Toolbox 2.0 release
  - This release from JB has major changes to how versions are installed and updated.
  - Version check added so it should pick up changes automatically
- Tweaks to menubar extra
  - Added Toolbox and IDE open actions
  - Seperators for nice
  - Consistent naming for favourites and standard projects

## [Multiple Version Update Mk.II] - 2023-05-01

- Fixes for fixes for multiple version update

## [Multiple Version Update] - 2023-05-01

- Fixes for Toolbox changes that expose multiple versions of apps
  - checks version of open app
  - uses new `.shellLink` file for tool name
- Faster opening of project when app is closed
- Include apps that have empty project lists
  - you can open apps with no projects from the menubar 
  - you can now open projects in Fleet (Fleet projects are still not populated)

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

## [Improvements] - 2022-06-14

- Handle cases when projects xml files are corrupted
- Add ability to choose sort order for apps

 ## [Update] - 2022-06-11

Improve keywords to match dashes and low-dashes when searching

## [Improvements] - 2022-05-13

- Handle cases when history files are corrupted or missing mandatory props
