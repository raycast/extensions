# Raycast Zoxide

A [Raycast](https://www.raycast.com) extension that integrates with the [zoxide command-line tool by Ajeet D'Souza](https://github.com/ajeetdsouza/zoxide).

## Requirements

- [zoxide](https://github.com/ajeetdsouza/zoxide#installation)
- [fzf](https://github.com/junegunn/fzf#installation) - zoxide dependency. If you have a working copy of zoxide you likely have fzf as well

## Features

### Overview

- Quickly search through your most-used directories and open selections in Finder
- Remove results directly from Raycast
- Add new directories to zoxide via Raycast & Finder
- Use Spotlight directory searching for folders not yet in your zoxide database

### Searching & Accessing Directories

Search through your most frequently accessed directories using the same zoxide + fzf combination used in the interactive version of the zoxide command right from within Raycast. Directories opened via the extension will have their score increased the same as if they were accessed via the command line.

History is shared between Raycast and your command line, so accessing directories via one influences the scores of the other. Don't want one of the results, or need to add a new folder to the list? Menu options and commands are provided to remove entries from the database as well as add the directory of the current Finder window to the zoxide database.

### Using Spotlight as Fallback

If a search returns no results you have the option to search for directories via Spotlight instead. Results are returned just the same, but show a score of `0.0` as they haven't yet been scored in zoxide. Directories opened via the Spotlight results will be added to zoxide for scoring and future use.