# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Discover the installed Yaps CLI without relying on Raycast's `PATH`, including per-user Applications installs.
- Reuse the signed-in desktop account automatically and require an active trial or Yaps Pro before vault access.
- Refuse legacy or unverifiable credential-based account checks and provide specific update, sign-in, and access guidance.
- Refresh an incomplete account cache only by briefly waking the verified standard Yaps app from its documented Applications location.
- Bound CLI validation and installed-application discovery, while keeping an explicit CLI override fail-closed and highest priority.

- Follow the signed-in Yaps desktop account's canonical settings automatically.
- Quietly wake the verified installed app when its account cache needs a short refresh.
- Search a local Yaps vault with recent notes, full-text results, Markdown previews, and privacy-aware metadata.
- Save clipboard text as a Markdown note with a predictable title and vault-relative destination.
- Open Yaps directly, with a download-page fallback when the desktop app is not installed.
- Discover the Yaps CLI across common macOS install locations while keeping file access local and bounded.
- Include three Store screenshots and the current Raycast API.
