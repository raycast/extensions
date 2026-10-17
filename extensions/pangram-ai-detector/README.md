# Pangram AI Detector

Check selected or copied text for AI writing with [Pangram](https://www.pangram.com).

## Setup

1. Create your own Pangram API key and add prepaid credits at the [Pangram API dashboard](https://www.pangram.com/apikey).
2. Enter the key when Raycast asks for it.

Each new Check sends your text to Pangram's API and spends your prepaid credits: about $0.05 per started 100 words.

This is an unofficial extension.

The icon uses [Pangram's logo](https://www.pangram.com/favicon.svg). The Pangram name and logo belong to Pangram Labs.

## Commands

- **Check Text**: checks the selected text, or the clipboard if nothing is selected.
- **Check Selected Text**: checks the selected text.
- **Check Clipboard Text**: checks the clipboard text.

A Cached Result for the same text and Model costs no credits. **Refresh (Spends Credits)** (⌘R) sends a new Check and spends credits.

## Results and Preferences

The Verdict tag reads AI-Generated, Mixed, or Human. The Breakdown shows AI (AI-Generated), Assisted (AI-Assisted), and Human (Human Written) percentages. Each Segment shows its label and Pangram's confidence. Pangram's headline appears as the navigation title.

**Result** shows **Cached · $0** or **New Check · ≈ $0.05**. The cost is an estimate from Pangram's word count, because Pangram's API does not return the cost.

- **Limited Confidence**: a **Short text** tag beside the Verdict warns on texts below 200 words by default. This is separate from Pangram's Segment confidence. The threshold is configurable in Extension Preferences.
- **Confirmations**: before sending text under 50 words or over 2,000 words, the extension asks for confirmation and shows an estimated cost. Pangram's results are less reliable under 50 words. You can continue with either length. The upper threshold is configurable.
- **Cache**: when a Check detects a new Model Version, older Cached Results are ignored by default. You can turn this off in Extension Preferences.
- **Segments**: Segment text from Pangram renders as Markdown by default. Turn on "Show Segment text literally" in Extension Preferences to show it exactly as returned, in a code block.
- **Model**: choose Default to follow Pangram's current Model, or select Pangram 4 in Extension Preferences.
- **Timeout**: Checks wait up to 300 seconds by default. You can change this in Extension Preferences.
- **Errors**: add a missing API key or replace an invalid key in Extension Preferences. For insufficient credits, choose Open API Dashboard. For a rate limit (HTTP 429), wait before choosing Try Again.
