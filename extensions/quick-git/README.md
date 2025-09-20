# Quick Git

Quickly run git commands through Raycast, allows you to do common git tasks like:
- Check status
- Stage and commit changes
- Discard changes and restore a file to its previous state
- Switch, create, delete, push and pull branches

## Git Configuration

Requires a minimum git version of `v2.23.0`.

If you are prompted for a password when trying to perform actions on remote repositories you might need to set up the [git credentials helper](https://git-scm.com/docs/gitcredentials). Or configure your SSH agent, good guides for this can be found on [Gitlab](https://docs.gitlab.com/user/ssh/) and in [Github's Authentication guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/working-with-ssh-key-passphrases).

Also it is highly recommend turning on auto remote setup in your root `.gitconfig` to make pushing new branches easier, eg.
```ino
[push]
	autoSetupRemote = true
```
