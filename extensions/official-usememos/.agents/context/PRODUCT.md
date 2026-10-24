# Product

## Register

product

## Platform

web

Raycast extension, not a browser surface: no custom CSS, no OKLCH palette, no typography scale, no motion. The controllable surface is copy, icon, Markdown structure inside `Detail` views, Raycast's fixed `Color` enum, and `ActionPanel` ordering. Treat "web" here as the closest bucket, not a literal match.

## Users

People who already run a Memos instance — self-hosted or the public demo — and want to capture, find, and manage notes without leaving Raycast. Raycast is "always on" for them, so the extension's job is to make Memos feel like it's always at their fingertips instead of a tab they have to switch to. A secondary motivation for choosing this over Raycast's own built-in Notes: Memos is free and self-hostable, so it gives unlimited, synced notes across devices without paying for Raycast Pro.

## Product Purpose

Quick, keyboard-first access to an existing Memos instance from inside Raycast — capture a memo, find one, act on it, and get back to what you were doing. It exists so reaching for a note never means opening a browser tab, and so someone who wants synced notes across devices isn't forced into Raycast's paid Notes tier to get them.

## Positioning

Unlimited, synced notes at your fingertips in Raycast — without paying for Raycast Pro, because Memos is free and self-hostable.

## Brand Personality

Fast, quiet, precise. It should feel like a first-party Raycast feature, not a bolted-on client with its own ceremony. Copy is direct and specific — never chatty, never apologetic, never marketing-toned, even in error states.

## Anti-references

Not a heavyweight sync client with its own onboarding flow or branding fighting Raycast's UI. Not chatty or over-explaining in copy. Not a dashboard — no command tries to be one (per `docs/philosophy.md`'s "fast paths first").

## Design Principles

- **Native over branded.** Every command should read as if Raycast shipped it, not as a third-party plugin asserting its own identity.
- **Free over paywalled.** The extension's reason to exist is unlimited, synced notes without Raycast Pro; nothing should make that value harder to see or reach.
- **Speed over ceremony.** Fewer steps between intent and a captured or found memo. No command becomes a dashboard.
- **Honest errors.** Every failure names the instance and the fix, never a bare "Request failed" (per `docs/philosophy.md`'s "Errors are for humans").
- **Show, don't ask.** Normalize and infer input where possible (e.g. the instance URL) instead of demanding an exact format from the user.

## Accessibility & Inclusion

Raycast's own component API handles baseline accessibility — contrast, keyboard navigation, screen reader labels. The one thing left in this extension's control: never signal state through Raycast's `Color` enum alone on accessories or tags — always pair color with text or an icon.
