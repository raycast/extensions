# PassGen Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Generate passwords with a configurable length of 4–128 characters
- Toggle lowercase, uppercase, digits and symbols independently
- Define a custom symbol set for services with restricted special characters
- Guarantee at least one character from every selected set, mixed in with a Fisher–Yates shuffle
- Draw all randomness from `crypto.randomInt()` (CSPRNG)
- Copy passwords with the `concealed` flag so they stay out of clipboard history
- Copy, paste or preview the generated password from the action panel
