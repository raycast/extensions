# Privacy Mask Changelog

## [Name model and privmask 0.5.0] - {PR_MERGE_DATE}

- Finds Japanese personal names with the privmask name model when the privmask CLI is installed, including on Macs without Apple Intelligence
- Updates privmask to 0.5.0: hostnames, job names and English product names are no longer masked as personal names
- Masks later mentions of a person already found, and names whose family name the surname list leaves out
- Retries log lines the on-device model refuses as an unsupported language

## [Initial Version] - 2026-10-01

- Masks personal information in the selected text or the clipboard, entirely on device
- Japanese personal names via Apple Intelligence's on-device model, with English names via `NLTagger`
- Japanese phone numbers and addresses via `NSDataDetector`, including full-width and unhyphenated formats
- My Numbers validated by check digit, plus email addresses and postal codes
- Credentials found by a published prefix or by the name that introduces the value, so a secret with no recognizable shape is still caught
- A term list of your own at `~/.config/privmask/terms.txt`, shared with the `privmask` CLI
- Deterministic findings appear immediately; names follow when the model has read the whole text, a chunk at a time
- Every finding shows its confidence and which detector found it, and can be left alone individually
- Whenever a detector could not run, the extension says what was not looked for
