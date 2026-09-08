# Telegram Changelog

## [Fix Photo Previews and Message Senders] - 2026-09-08

- Show photos in the detail pane. They were embedded as base64 data URIs, which Raycast's markdown renderer drops once they grow large, leaving the pane blank
- Resolve message senders from the entity attached to each message rather than `client.getEntity`, which throws in a fresh command process because the session does not persist an entity cache, showing group messages as "Unknown User"
- Attribute messages sent on behalf of a channel, such as channel posts and anonymous group admins

## [Add 2-Step Verification Login Support] - 2026-03-26

- Handle Telegram 2FA (`SESSION_PASSWORD_NEEDED`) with a password step
- Add resend verification code action and inline hint on code entry screen
- Improve auth error handling for invalid/expired codes, wrong password, and flood wait

## [Initial Version] - 2026-02-04
