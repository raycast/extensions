# Caviarde Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Mask and Paste: replace personal data in the clipboard with placeholders, then
  paste the result
- Pattern detection with no network and no dependency: emails, French and
  international phone numbers, IPv4 and IPv6, IBAN (mod-97), credit cards and
  SIRET (Luhn), SIREN, API keys, JWTs, PEM private keys, and `@mentions`
- Optional semantic detection for names, places, street addresses and company
  names, through a detector running on the user's own machine
- A lone first name is masked with the same placeholder as the full name it
  belongs to elsewhere in the text
- Technical identifiers pass through untouched, so masked text stays usable for
  debugging and database queries
- Set up Detector: start the local detector from Raycast, without a terminal
- Degrades to pattern detection alone when the detector is unavailable, and says
  so in the HUD rather than failing
