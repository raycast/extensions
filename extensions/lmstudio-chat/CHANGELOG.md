# LM Studio Chat Changelog

## [Initial Release] - {PR_MERGE_DATE}

- **Chat**: streaming conversations with local models, laid out as a conversation map — one row per turn (newest first) with a model-colored tag and a live dot while streaming; the selected turn is rendered Quick AI style on the right
- Type directly into the top search bar; Enter sends the message or a follow-up, no extra form pages
- **Chat History**: search past conversations and continue any of them where you left off
- **Manage Models**: load and unload downloaded models without leaving Raycast
- Model picker per message; configurable server URL, API token, system prompt, temperature, and default model
- Model lists are fetched fresh from the server every 10 seconds — stale models never show up
- Partial answers are preserved and saved if a stream fails or is interrupted
- Attach images (sent to vision models) and text/code files (added to the prompt as context) from Finder selection or the clipboard
- Oversized images are automatically downscaled (macOS `sips`, long edge ≤ 2048 px) instead of being rejected
