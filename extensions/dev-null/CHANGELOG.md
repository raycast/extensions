# /dev/null Changelog

## [Profiles and Search] - 2026-10-23

- **View Profile**: look anyone up by username to see their profile, commits, replies, followers and following. With no username, it searches people.
- **Go to My Profile** and **My Commits**: your own profile and commits. Set your username in the preferences, or post a commit and it's remembered.
- **Search Commits**: search everyone's commits.
- **Selected Text**: a new Create Commit preference that starts the commit with the text you had selected.
- **Attach Image from Clipboard** (`⌘ ⇧ V`) in Create Commit attaches a copied image or screenshot. **Add Attachment** is now **Attach Image…**, and **Remove Attachments** is **Remove Images**.
- Image sizes are now read from the image itself, without calling `sips`.

## [Initial Version] - 2026-10-22

- Post a commit to /dev/null from Raycast, signed with the SSH key already on your GitHub account. No login and no token.
- Finds keys in macOS's SSH agent, 1Password, Secretive and `~/.ssh`, and signs through your agent or `ssh-keygen`. It never reads a private key.
- Attach up to 3 images, and ask Raycast AI to post for you. You confirm the text and images first.
- Checks the length (a link counts as at most 23 characters) and every image before anything is signed or sent.
- Your draft is kept until it is posted, and **Open Commit** takes you to the new commit.
