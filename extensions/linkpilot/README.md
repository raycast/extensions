# LinkPilot for Raycast

Share a password or an API key as a link that opens **once** and then
destroys itself, and shorten URLs, without leaving Raycast.

## Commands

**Create Secret Link** — type a password, key or note, pick how long it
lives, and the share link lands on your clipboard.

**Shorten Link** — opens a form with the URL already filled in from your
clipboard when it holds one. If it does not, the field is simply empty and
you type or paste a URL: the command never refuses text you did not
knowingly give it. Press Enter and the short link lands on your clipboard.

## What "encrypted" means here

The secret is encrypted with AES-GCM-256 **on your machine**, before any
request is made. LinkPilot's API refuses a plaintext payload outright; it
stores a blob it holds no key for and cannot read.

The decryption key travels only in the `#` fragment of the share link,
which browsers never transmit. So **send the whole link**: everything after
the `#` is the key, and nothing recovers the secret without it — including
LinkPilot.

That is also the trade. Lose the link and the secret is gone. That is the
guarantee working, not a gap.
