# ClearURLs Cleaner

Clean tracking parameters from URLs using the rules from the [ClearURLs](https://clearurls.app/) project.

## Description

ClearURLs Cleaner removes tracking, marketing, and redundant parameters from links copied to your clipboard or passed as an argument. It uses the same rule set as the official [ClearURLs browser extension](https://github.com/ClearURLs/Addon), fetched directly from the upstream [ClearURLs Rules repository](https://github.com/ClearURLs/Rules).

## Usage

- Open the **Clean URL** command.
- Either pass a URL as an argument or copy a URL to the clipboard.
- The cleaned URL is shown and can be copied or opened in the browser.

## Preferences

- **Remove referral marketing parameters**: optionally strips parameters such as `utm_source`, `utm_medium`, and similar referral tags.

## Data source

The extension downloads the ClearURLs rule set from:
Code kopieren
https://raw.githubusercontent.com/ClearURLs/Rules/refs/heads/master/data.min.json

This file is part of the [ClearURLs/Rules](https://github.com/ClearURLs/Rules) repository, licensed under **LGPL v3**.

## License

The extension source code is licensed under the MIT License. The ClearURLs rules are licensed under LGPL v3 by the ClearURLs project and are not covered by this extension's MIT License.