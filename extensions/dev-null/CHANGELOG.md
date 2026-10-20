# /dev/null Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Post a commit to /dev/null from Raycast, signed with the SSH key already on your GitHub account. No login and no token.
- Finds keys in macOS's SSH agent, 1Password, Secretive and `~/.ssh`, and signs through your agent or `ssh-keygen`. It never reads a private key.
- Attach up to 3 images, and ask Raycast AI to post for you. You confirm the text and images first.
- Checks the length (a link counts as at most 23 characters) and every image before anything is signed or sent.
- Your draft is kept until it is posted, and **Open Commit** takes you to the new commit.
