# Social Downloader Implementation Plan

> Implement inline in this session with executing-plans; the user authorized implementation.

**Goal:** Download public social media videos and audio through Raycast on Windows.
**Architecture:** Native Raycast forms backed by a cancellable child-process runner and pure format-selection helpers.
**Tech Stack:** TypeScript, React, Raycast API, Node.js, yt-dlp, FFmpeg.
**Spec:** ../specs/2026-10-31-downloader-design.md

## Global constraints
Windows only; separate executable installation; public URLs; one media item; local execution.

## Review focus
Reject deceptive hostnames and non-HTTP URLs. Preserve paths with spaces as arguments. Never overwrite existing media. Kill the entire conversion process tree on cancel. Reject playlist results and unavailable source formats.

## Tasks
- [x] Create manifest, TypeScript configuration and pure media helpers. Tests: URL validation, actual source resolutions/audio tracks, selectors, conversion arguments and progress records.
- [x] Implement process runner and dependency checks. Test successful output, failure, timeout, abort and Windows child-process termination with local fixture processes.
- [x] Build link analysis, media choices and progress/completion forms. Check type definitions against installed Raycast API.
- [x] Document installation and limitations. Tests: 11/11 pass; type checking, lint and Raycast build pass. Real YouTube downloads in all four output formats verified with FFprobe. Runtime limitations recorded in docs/verification.md.
