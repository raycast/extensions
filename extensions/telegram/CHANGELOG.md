# Telegram Changelog

## [Fix Authentication Flow & Add 2FA Support] - {PR_MERGE_DATE}

- Always send a fresh verification code when requested (fixes code not being received on retry)
- Handle `SESSION_PASSWORD_NEEDED` to support Telegram accounts with Two-Factor Authentication (2FA)
- Add 2FA password form shown automatically after code verification when 2FA is enabled
- Clear stale `phoneCodeHash` after a failed sign-in attempt so users can request a fresh code
- Add "Reset Telegram Session" command to recover from broken authentication states
- Improve error messages for common Telegram errors (PHONE_CODE_EXPIRED, PHONE_CODE_INVALID, API_ID_INVALID, etc.)

## [Initial Version] - 2026-02-04
