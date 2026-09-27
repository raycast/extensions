# oMLX Changelog

## [Download, Stats, and Vision] - {PR_MERGE_DATE}

- Download Model: search and download from HuggingFace and ModelScope
- Manage Downloads: track progress, cancel, retry, remove downloads
- Check for Updates: dedicated command + passive toast notification
- Session vs All-Time stats with dropdown toggle
- Per-model stats (push from Serving Stats and Manage Models)
- Favorite/unfavorite models with star indicator
- View server logs inside Serving Stats
- Disk-only models shown in "Other" section
- Reload Models action for triggering model re-discovery
- Fix vision: convert Raycast image format to OpenAI for VLM models
- Fix tool results and assistant message format conversion
- Deep links for all dashboard actions
- MLX-only filter toggle for HuggingFace search
- ModelScope as alternative model source
- Consistent action ordering across all commands

## [Initial Release] - {PR_MERGE_DATE}

- AI Model Provider: use oMLX models natively in AI Chat, Quick AI, and AI Commands
- Manage Models: load, eject, pin, and delete models
- Serving Stats: speed, cache efficiency, memory, and active model monitoring
- Start/Stop Server: control the oMLX server from Raycast
- Open Web Dashboard: quick access to the oMLX web UI
- Reasoning effort support for thinking-capable models
- Vision detection for VLM models
