# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Browse, search, preview, create, edit, duplicate, archive, restore, and delete
  prompts stored as local Markdown files.
- Paste prompts into the frontmost application or copy them to the clipboard.
- Fill reusable `{{placeholders}}` before using a prompt.
- Copy ready prompts from the macOS menu bar, while prompts with placeholders
  open on the chosen prompt in the main library for completion.
- Return every indexed library match instead of hiding matches after a fixed
  500-prompt ceiling.
- Keep usage ranking in a local JSON cache compatible with Raycast's runtime.
- Ignore advanced-feature settings from local development builds so the Store
  release always uses its compatible built-in search.
- Keep the initial Store release local-only, with no Prompt Studio network
  requests or account required.
