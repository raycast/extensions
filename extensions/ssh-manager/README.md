<p align="center">
    <img src="./assets/command-icon.png" width="100" height="100" />
</p>

# SSH Connection Manager

## ⚙️ Configuration

You can select from 2 config sources:

1. **LocalStorage** - this stores SSH connections using Raycast's secure [Storage](https://developers.raycast.com/api-reference/storage).

- ✅ Allows you to keep a separate source of truth for the extension
- ❌ It may be difficult for you to keep track of your connections
- ❌ No manual editing e.g. through a text editor

2. **SSH Config** - this uses an ssh config file you likely already have on your system. By default, this will use `~/.ssh/config` BUT you can easily choose a different file by selecting it in Preferences

- ✅ Seamlessly continue to use your existing config file

### OpenSSH Config

The list follows `Include` files and shows literal host aliases. Opening or copying a connection uses the selected alias and config, so OpenSSH applies its own options and conditional rules. The list shows possible destination hints from literal `Match host` and `Match originalhost` rules. It does not evaluate those rules or execute `Match exec` while browsing.

Edits change only the selected single-alias block in the primary file. Open included, shared, duplicate, or otherwise complex blocks in a text editor to change them. Rename and delete in a text editor if your configuration contains `Match` rules. **Set Connection Icon** stores one emoji in a `#SSHManagerIcon` comment in an editable block.
