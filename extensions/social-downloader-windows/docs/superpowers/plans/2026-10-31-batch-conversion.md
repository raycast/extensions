# Batch downloads and conversion

User scope: multiple links, playlists, more social sites, local files and download conversion, then Store submission.

Native Raycast UI: dynamic URL fields with Add Link action/shortcut; preview playlist entries and select items; settings shared per batch; queue list with status, cancellation and retry. Up to three concurrent downloads. Local conversion command accepts multiple files. Original single-video advanced stream selector remains accessible.

Implementation: batch.ts owns playlist expansion, format presets and bounded queue scheduling; conversion.ts owns FFprobe/FFmpeg operations; workspace.tsx owns native forms and queue views. Existing downloader and automatic tools remain shared. Explicit platform host list expands to TikTok, Facebook, Reddit, Vimeo, Twitch and Pinterest. Playlist preview limited to 200 entries per source and requires selection before download. Each failure is isolated. MP4 compatibility conversion uses H.264/AAC; MKV preserves source streams unless conversion requested. Never overwrite input or existing output. Cancellation kills child processes.

- [x] Add and test playlist normalization, format selection and queue concurrency/failure isolation.
- [x] Add and test local conversion and download-to-conversion integration.
- [x] Implement native multiple-link, playlist selection, queue and converter flows.
- [ ] Verify tests/build/bundle and real media operations; prepare Store metadata and inspect publishing prerequisites.
