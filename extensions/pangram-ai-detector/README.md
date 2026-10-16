# Pangram AI Detector

Check selected or copied text for AI writing with [Pangram](https://www.pangram.com).

## Setup

1. Create a Pangram API key and add credits at [pangram.com/apikey](https://www.pangram.com/apikey).
2. Paste the key when Raycast asks for it on first run.

Checks cost about $0.05 per 100 words. Text is sent to Pangram's API.

This is an unofficial extension. Each user needs their own Pangram API key and credits.

The icon uses [Pangram's logo](https://www.pangram.com/favicon.svg). The Pangram name and logo belong to Pangram Labs.

## Commands

- **Check Text**: checks the selected text, or the clipboard if nothing is selected.
- **Check Selected Text**: checks the selected text.
- **Check Clipboard Text**: checks the clipboard text.

Results for the same text and model are cached. Press ⌘R to check again.

## Results and Preferences

Results include a Verdict, the AI-Generated, AI-Assisted, and Human Written Breakdown, and individual Segments with their own confidence levels.

- **Short text**: results below 200 words show Limited Confidence by default. This is the extension's warning, separate from Pangram's Segment confidence. The cutoff is configurable; Pangram does not publish its website's exact cutoff.
- **Confirmations**: before sending text under 50 words or over 2,000 words, the extension asks for confirmation and shows an estimated cost. You can continue with either length. The upper limit is configurable.
- **Cache**: new Model Versions invalidate older Cached Results by default. You can turn this off in Extension Preferences. Refreshing sends a new Check and spends credits.
- **Timeout**: Checks wait up to 300 seconds by default. You can change this in Extension Preferences.
