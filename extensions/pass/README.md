# Pass

An extension to handle
[the standard unix password manager](https://www.passwordstore.org/)
in a convenient way using Raycast

## Quick Configuration Guide for `pass`

Before using this extension, you must have `pass` configured correctly,
you will need some knowledge of [GnuPG](https://gnupg.org/) and [Git](https://git-scm.com/) to use its full potential.

Below is a quick guide to setting up `pass` on macOS,
if you've never used `pass` before.

1. Install [Homebrew](https://brew.sh/) if you haven't installed it yet.
2. Install `gpg` with `brew install gnupg`.
3. Generate a new key with the command `gpg --full-generate-key` and follow the on-screen instructions.
4. Get the ID of the newly created key with `gpg --list-keys`.
5. Install `pass` with `brew install pass`.
6. Initialize `pass` with your GPG ID: `pass init $GPG_ID`.

You can now store a new password `pass insert password-name`.

Optionally you can set up a Git repository `pass git init`,
and use the `pass git` command to handle changes to the repository.
