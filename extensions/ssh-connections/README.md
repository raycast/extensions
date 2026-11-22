# SSH Connections

Browse, search, manage and connect to hosts in your local `~/.ssh/config` from Raycast. Select a host and press Return to connect, or use Command-N to add a host. Open the action menu to edit a host, set an emoji, manage common SSH options, copy the SSH command or delete a host.

Select Terminal, iTerm or Ghostty in extension preferences. macOS may request permission to automate the selected app. Ghostty's AppleScript interface was tested with version 1.4.0. Opening a terminal does not guarantee a successful login; check the terminal for authentication and connection errors.

The extension reads explicit host aliases from the main file and its Include files. It executes `/usr/bin/ssh` with the alias so OpenSSH evaluates the actual configuration, including conditional `Match` and proxy rules. The list displays statically read configuration rather than a live connection status. The extension does not run `Match` commands while listing hosts.

Changes are written to SSH configuration files. To preserve other hosts and rules, blocks with multiple distinct host patterns, duplicate aliases, duplicate managed options or Include directives must be edited manually. Renaming or deleting an alias with explicit host Match rules, or a block with multiple equivalent spellings, also requires manual editing. Inline comments on edited fields may be replaced. Custom emoji are stored in `#SSHManagerIcon` comments. The extension does not store passwords or private key contents.
