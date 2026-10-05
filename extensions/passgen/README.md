# PassGen

Generate cryptographically secure passwords directly from Raycast, with full control over length and character sets.

## Why another password generator?

PassGen is built around correctness rather than convenience shortcuts:

- **Cryptographically secure randomness.** Every character is drawn with `crypto.randomInt()`, a CSPRNG. Generators built on `Math.random()` are predictable and unsuitable for passwords.
- **Guaranteed character-set coverage.** If you enable uppercase, digits and symbols, the result is guaranteed to contain at least one of each — no more regenerating until a site's password policy is satisfied.
- **Unbiased shuffling.** The guaranteed characters are mixed in with a Fisher–Yates shuffle, so they never end up in predictable positions.
- **Clipboard privacy.** Passwords are copied with the `concealed` flag, so they are excluded from Raycast's clipboard history.
- **Configurable symbol set.** Define exactly which special characters are allowed — useful for services that reject certain symbols.

## Usage

Run **Generate Password**, adjust the options, then submit:

| Action | Shortcut |
| --- | --- |
| Generate and copy to clipboard | `⏎` |
| Generate and paste into the frontmost app | `⌘` `⏎` |
| Generate and show without copying | `⌘` `G` |
| Copy the shown password | `⌘` `⇧` `C` |

## Options

- **Length** — 4 to 128 characters (default 16)
- **Lowercase** (a–z), **Uppercase** (A–Z), **Digits** (0–9), **Symbols** — toggle any combination
- **Symbol Set** — the pool of special characters that may appear

All fields remember their last value, so your preferred configuration is one keystroke away.

## Validation

The form rejects impossible configurations up front: a length outside 4–128, no character sets selected, or a length too short to include one character from every selected set.
