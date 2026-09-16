# Buzz Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search Channels: browse every channel on your relay, open one in the Buzz app, or drill into its
  recent messages to read and react. Thread replies are collapsed into their root with a reply
  count, matching how the Buzz app displays a channel.
- Search Messages: NIP-50 full-text search across the channels you can access, with a deep link
  that opens a hit in the Buzz app anchored to the right message.
- Send Message: pick a channel, an existing direct-message conversation, or a person or agent found
  by name, then compose. All three lead to the same composer.
- Set Status: NIP-38 status with reusable presets and an emoji picker.
- Requests are signed locally with NIP-98; the private key never leaves the machine.
