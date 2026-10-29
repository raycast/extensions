# Raycast Extensions Review Guidance

This repository holds every public Raycast Store extension, one per folder under `extensions/<name>/`. Structured rules live in `config.json`; these apply to every comment.

## Review only what this PR changes

What: Comment on changes this PR introduces. For problems that already exist on `main` and that the PR doesn't touch (old changelog dates, existing `AGENTS.md`, existing tests, old lint config), either leave them out or add at most one note clearly labelled "pre-existing, not from this PR".

Never review commits made by `raycastbot` after merge ("Update CHANGELOG.md", image optimisation). They replace `{PR_MERGE_DATE}` with the real date by design. Once a PR is merged, don't post new findings on it.

Don't re-raise a thread the author has already resolved unless the new commit brings the problem back. When the author answers a finding with a reason (an intentional product choice, a platform limitation, a constraint you missed), accept it unless the code contradicts them. Don't post the same reply twice.

## Verify before claiming

- **Security and dependency claims:** check the installed version against the actual advisory before calling a package vulnerable.
- **Deliberate limits aren't bugs:** a page cap, timeout or result limit is a safety bound. At most, suggest telling the user when results are truncated.
- **The old code isn't the spec:** when a PR changes behavior on purpose, review the new behavior. Don't treat the previous docs or code as the source of truth.
- **Pre-existing problems:** label anything you flag that was already on `main` as pre-existing, and don't block on it.

## Review comment phrasing

What: Never use validating phrases like "You're absolutely right", "You're correct", "That's a good point", or similar affirmations in responses.

Why: These phrases come across as overly agreeable and can seem insincere. Instead, acknowledge the user's input naturally and move directly to addressing the technical content.

Good:
"While it's true that some command-line tools write informational messages to stderr, `qlmanage` specifically uses stderr for actual error reporting..."

Bad:
"You're absolutely right. While it's true that some command-line tools..."

## Submenu ellipses

Do not flag missing ellipses on Raycast `ActionPanel.Submenu` titles; `Submenu` automatically adds the ellipsis, so titles should use the plain action label unless the codebase explicitly requires otherwise.
