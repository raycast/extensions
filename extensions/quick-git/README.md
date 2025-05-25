# Quick Git

Quickly run git commands through Raycast, allows you to do common git tasks like:
- Check status
- Stage and commit changes
- Discard changes and restore a file to it's previous state
- Switch, create, delete, push and pull branches

Quickly commit and push your changes without having to change away from your editor.

Just to note that this is not a full Git GUI, rather it is just a way to very quickly run those common git commands that you do all the time. For more complex tasks you still wanna use your terminal.

Requires a minimum git version of v2.23.0

Also I highly recommend turning on auto remote setup in your root `.gitconfig` to make pushing new branches easier, eg.
```
[push]
	autoSetupRemote = true
```
