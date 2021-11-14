# Conventional Commit

Form to enter information to paste a Conventional Commit into your application of choice.

## Configuration

Quick breakdown of what is available:

- type (dropdown)
- description (manual entry)
- scope (manual entry)
- body (manual entry)
- breaking change (manual entry)

### Format(s)

Three available:

1. `{emoji}{scope} {subject}`
1. `{emoji}{scope}: {subject}`
1. `{type}{scope}: {subject}`

Examples:

1. `♻️ (scope) subject here`
1. `♻️ (scope): subject here`
1. `refactor(scope) subject here`

😜 [Gitmoji](https://gitmoji.dev/) provided by [carloscuesta](https://github.com/carloscuesta/gitmoji) with a few additions (`chore, extension, rollforward, run-build`).

### Breaking Change

If checkbox is selected will require additional notation.

**📝️ Please Note:** If `{emoji}` is in the current `format` it will add in the collision/breaking emoji (`💥️`) prior.

## Roadmap

- [ ] Preview commit based on format selected
- [ ] Custom formatting options (subject, breaking change, etc.)
- [ ] Automatic updates from Gitmoji (?)
- [ ] Issue Tracker integration (?)
