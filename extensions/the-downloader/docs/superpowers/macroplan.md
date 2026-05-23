# The Downloader — Macro Plan

**Status:** Active roadmap. Phase 2 (gallery-dl + URL auto-routing + YouTube-transcript output) is complete and merged to `develop`. `main` is at the original fork. This plan covers the next arc.

**Vision:** "THE download extension" — one Raycast extension that grabs video, audio, image galleries, and webpages, in the format the user wants, via both a fast (argument-driven) path and a polished (form-driven) path.

**How to use this plan:** Build one section at a time, in order. Each section is its own cycle: brainstorm → design spec (`docs/superpowers/specs/`) → implementation plan (`docs/superpowers/plans/`) → subagent-driven build → merge to `develop`. Do not start a section until the previous one is merged.

## Section 1 — Settings & Onboarding

Define the extension's configuration: per content type (**images / videos / websites**) a default format, quality, and file extension; plus the default download folder. Extend the first-run onboarding so the user configures all of this, not only the folder.

- **Open decision for this section's brainstorm:** in Raycast, "settings" and "onboarding" are both **preferences** — a flat list declared in `package.json`, rendered by Raycast's preferences UI. The sketched grouped layout (images / videos / websites as boxed sections) cannot be drawn as a flat preference list; matching it means a custom onboarding *view-command* with persisted state. Resolve flat-preferences vs. custom-onboarding-view during the brainstorm.
- **Foundational:** Sections 2 and 4 read their configuration from here.

## Section 2 — Fast Download

A new `no-view` command, **Fast Download**, with a `url` command-argument (the inline-pill UX). Paste a URL, press Enter → it downloads instantly with HUD feedback, no form. It reads format / quality / destination (and method — auto-detect or a fixed tool) from Section 1's settings. Built on the shared routing lib, so it auto-routes yt-dlp / gallery-dl from day one and gains monolith automatically once Section 3 lands.

## Section 3 — monolith (webpage saving)

Add `monolith` as the third method: a `src/lib/monolith.ts`, a `"webpage"` source type, routing so a plain webpage URL is saved as a single self-contained `.html`, and monolith wired into the tool-aware installer and updater. The "websites" settings from Section 1 become functional here.

## Section 4 — Polished Download UX

Redesign the main `Download` command's form: `url` + a `method` field (yt-dlp / gallery-dl / monolith — auto-detected, user-overridable) with a status indicator; *separated* `format-type` (audio / video / image), `quality`, and `extension` fields; a download graphic element; the folder picker. The largest section — a UX overhaul — and it benefits from every section before it.

## Build order

Section 1 → 2 → 3 → 4. Settings first (everything reads config from it), then Fast Download (consumes it), then monolith (the third method), then the Polished UX (largest, and it expects all three tools to exist).

## Deferred (not in this plan)

faster-whisper (local audio transcription) and markitdown (Markdown conversion) — explicitly deferred by the user.

## Design sketches

Four sketches inform this plan — the Fast Download window, the polished form layout, the Raycast command-argument pattern, and the onboarding screen. They live with the user; re-attach the relevant one when brainstorming each section.
