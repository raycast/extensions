# OTP Inbox Changelog

## [Update] - {PR_MERGE_DATE}

- Prefer plain-text MIME content and sanitize HTML fallback before verification-method extraction.
- Accept only one unambiguous 4–8 digit numeric OTP.
- Prevent HTML/CSS tokens such as `font-size` from being exposed as pasteable codes.
- Add explicit, manually invoked Open/Copy actions for high-confidence HTTPS verification CTAs.
- Keep OTP and verification-link actions independent when emails contain both.
- Add conservative optional local pattern learning for manually selected recurring CTAs.
- Add deterministic link scoring, public-suffix-aware domain checks, anti-footer filtering, and readable-redirect rejection.
- Add comprehensive unit tests for OTP, MIME, HTML sanitization, link ranking, and learned patterns.

## [Initial Version] - 2024-04-16

- Automatically detects the OTP code from the email
- Shows your recent email verification codes
- Copy the code to your clipboard or paste directly into the active application
- View recent emails in case the OTP code was not detected correctly
