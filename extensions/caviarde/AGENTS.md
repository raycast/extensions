# Working on Caviarde

Caviarde masks personal data in the clipboard before it is pasted into an AI
tool. That purpose sets most of the rules below: a tool that handles other
people's data has to be held to the standard it claims to enforce.

## Never put real data in this repository

Test fixtures, documentation samples and code comments use **invented** names,
emails, IBANs and company names. Never paste a real ticket, a real customer name
or a real identifier into a file, not even temporarily, not even in a file you
plan to delete.

When a real case reveals a bug, extract the **pattern** and replay it with
invented data: an `@Firstname Lastname` mention, a lone first name elsewhere in
the text, a capitalised particle. The pattern is what the test needs; the
identity is not.

The existing cast is Camille Rousseau, Camille Bernard, Marie Dubois, Marie Le
Gall, Marie de Bourbon, Jean-Pierre Lefevre, Rose Martin, Marc Dupont, Theo,
André Müller, Jean, Boulangerie Martin and Acme Solutions SARL. Reuse it.
Identifiers are sequential (`123456782`,
`12345678200010`, `01.23.45.67.89`) so that no reader mistakes them for real
allocations.

Secret-shaped fixtures (AWS key ids, JWTs, PEM blocks) are the one exception:
the detectors cannot be proven without them. They live in `src/**/*.test.ts`,
are excluded from GitHub secret-scanning **alerts** by
`.github/secret_scanning.yml`, and must be fake. Keep them there; a fixture that
escapes into documentation escapes that exclusion too. Push protection is a
separate control, so the first push carrying these fixtures may need an explicit
bypass.

## Zero content logging

No `console.log` of clipboard text, detected values, spans or placeholder
mappings. Not in development, not temporarily. Errors are reported by class and
message, never with the text that caused them. No telemetry, no analytics, no
persistence.

## Invariants that are easy to break

- **Only the command entry points import `@raycast/api`.** That package has no
  entry point outside the Raycast runtime, so any module importing it becomes
  impossible to unit-test. Preference parsing stays pure in `preferences.ts`.
- **`detector/client.ts` is the only module that knows the detector's endpoint,
  payload and response shape.** The API is unversioned; keep the blast radius at
  one file.
- **Deterministic spans win every overlap with semantic ones**, and an
  overlapping semantic span is dropped whole, never trimmed. Trimming a name out
  of an email leaves the domain live.
- **Technical identifiers must survive masking.** UUIDs, object ids, numeric user
  and company ids, timestamps, git SHAs, loopback addresses. Masked text that
  cannot be used for a database query has failed. `identifiers.test.ts` locks
  this in.
- **A checksum alone never qualifies a match.** Luhn is one digit, so about one
  arbitrary number in ten passes it: a card needs an issuer prefix as well, a
  bare SIREN needs a keyword or its spaced form. Where a test asserts that some
  identifier is left alone, assert first that it does satisfy the checksum, or
  the test passes for the wrong reason.
- **The managed container publishes on the port the preference names.** Binding a
  fixed port while polling the preference reports a failure for a detector that
  is running, which is the one thing the setup screen must never do.
- **Placeholders are `[TYPE_N]`**, single brackets, 1-indexed per type. This is
  masking, not redaction: `redact` appears in no identifier.
- **Nothing we declare floats.** Exact dependency versions, `save-exact=true`,
  pinned Node and pnpm, detector image pinned by sha256 digest. Auto-installed
  peers are the exception and are pinned by the lockfile alone. Check a candidate
  version against `@raycast/eslint-config`'s peer ranges before bumping it; the
  registry's `latest` is regularly outside them.

## Verify, do not assume

Run a change through the real pipeline before claiming what it does. Assuming an
outcome is how the loopback bug survived a green unit-test suite: the
deterministic layer had been fixed, the detector still reported `127.0.0.1`, and
only an end-to-end run against a live detector showed it.

The confidence thresholds in `compose.yaml` come from a small sample, not a
benchmark, and the model's scores are context-dependent: the same string lands on
either side of a threshold in two different documents. One sample proves nothing.

## Practical notes

- The detector must be running for the semantic layer: `docker compose up -d`.
  Containers stop when the Mac sleeps.
- Integration tests skip themselves when the detector is down, mirroring how the
  extension degrades.
- Image sources live in `media/`, images the extension loads at runtime in
  `assets/`, and the store checklist verifies that separation. There is no
  `metadata/`: the store's `metadata-images` check wants a Raycast Window Capture
  composite, centred with roughly 12% padding on every side, and the store page
  renders the README regardless, so the illustration lives in `media/` and is shown
  there.
- Changing the icon needs a full Raycast restart. `assets/icon.png` is regenerated
  from `media/icon.svg` with `sips`, not `qlmanage`, which flattens transparency
  onto white. The wider illustrations go the other way: `qlmanage` renders their
  colours correctly where `sips` ignores tspan fills, then `sips` crops the band.

### Publishing

`ray publish` copies the working directory, skipping only `.git`, `.github`,
`node_modules` and a few build artefacts. It does not read `.gitignore`, so
anything sitting in the folder ships, including agent scratch directories. Publish
from a throwaway `git clone` rather than from the working copy, which also pins
what goes out to a commit that exists on the remote.

It requires `package-lock.json` at version 2 or above and refuses outright when
`pnpm-lock.yaml` is present, so delete that one in the clone after installing.
Regenerate `package-lock.json` with `npm install --package-lock-only` in a
directory holding only the manifest: run in place, npm reads pnpm's virtual store
and fails to resolve.

`CLAUDE.md` is a symlink and has no business in a monorepo; drop it in the clone
too. The command needs an interactive terminal for its GitHub sign-in.

## Where things are documented

`docs/architecture.md` for the module layout and the span-merging rules,
`docs/limitations.md` for what is knowingly not detected,
`docs/security-notes.md` for the detector image audit and why it is pinned,
`docs/detector-patch.md` for the organisation label and its Apache-2.0
attribution.

Documentation is written for someone receiving the project, not for whoever is
working on it. No plans, no open questions, no second person, no notes to self.
