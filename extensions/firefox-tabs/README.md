# Firefox Tabs

Search and switch open Firefox tabs from Raycast.

## Setup

1. **Install the Firefox extension** from [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/raycast-tab-manager/)
2. Run the **Set up Firefox Bridge** command in Raycast

That's it -- your tabs will appear in the **Search Firefox Tabs** command.

## Multiple Firefox Profiles

Each Firefox profile needs its own copy of the companion extension. Tabs from every running profile appear together, with each window tagged by its profile. **Set up Firefox Bridge** lists your profiles and installs the extension in the ones that need it, and **Search Firefox Tabs** shows running profiles that are missing it under Needs Setup.

## Privacy

Your tabs never leave your machine: Raycast talks to Firefox over localhost only. Setup downloads the native host from this project's GitHub releases, and the native host fetches tab favicons from the sites you have open.
