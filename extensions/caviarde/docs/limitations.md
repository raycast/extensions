# Limitations

Detection is best-effort. The semantic layer is a probabilistic model and will
miss things. Nothing here constitutes a compliance guarantee. Read what you
paste.

## Technical identifiers are not masked

Masked text has to stay usable for debugging and database queries, so
identifiers are deliberately left alone: UUIDs, object ids, prefixed ids
(`cus_`, `org_`, `usr_`), bare numeric user and company ids, order references,
epoch timestamps, git SHAs, semver, and Kubernetes pod names.

Two rules make that work. A bare nine-digit number is read as a SIREN only when a
keyword precedes it or it is written `123 456 782`, because one random nine-digit
number in ten passes the Luhn checksum. And loopback, unspecified and link-local
addresses (`127.0.0.0/8`, `0.0.0.0`, `169.254.0.0/16`, `::1`, `fe80::/10`) are
never masked, since they identify nobody.

Private ranges (`10/8`, `172.16/12`, `192.168/16`) **are** masked, on the grounds
that they can describe an internal topology.

A numeric identifier of 13 to 19 digits that happens to pass Luhn is read as a
card. Roughly one such identifier in ten. A 13-digit millisecond timestamp is in
range.

## Names

Full names in prose are detected by the semantic layer. Two cases are handled
without it, by pattern alone: an `@mention` marks a person, and a first name
appearing on its own is masked when the same person's full name appears
elsewhere in the text.

A bare first name with no full-name anchor and no `@` is not detected. The model
scores an isolated first name far below the threshold that ordinary French nouns
already reach, so no threshold separates them.

## Organisations

Company names are detected only when the detector runs the patch described in
`detector-patch.md`. Without it they pass through untouched and the
corresponding preference has no effect.

Detection is imperfect in both directions. Some real companies score below the
threshold and are missed. Internal team names are sometimes masked, and scores
vary with surrounding text, so the threshold is not a clean separation.
Over-masking a team name is the harmless direction; missing a company name is
not, and it happens.

## SIREN and SIRET

Handled by the deterministic layer rather than the detector, which reports a
SIRET as a credit card (a SIRET is fourteen digits and Luhn-valid by
construction, La Poste excepted) and does not detect a SIREN at all.

## French phone numbers

The detector only sees numbers in international `+` form unless it is given a
region hint, which the `phoneRegions` preference supplies. The deterministic
layer recognises the French national format regardless.

## Confidence thresholds are a tuning choice

The thresholds set in `compose.yaml` were chosen from a small sample of synthetic
French text, not from a benchmark. Different text will behave differently. The
upstream repository ships `benchmarks/pii-accuracy`, which runs a labelled corpus
against a live detector and is the right tool for calibrating them properly.
