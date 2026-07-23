# Teleport Changelog

## [Fix Login] - 2026-07-21

- Force OTP MFA mode so login works on clusters that prefer WebAuthn
- Wait for the real password and OTP prompts instead of sending them blindly
- Detect failures via the tsh exit code and surface the error message (no more false "Logged in !")
- Raise the login timeout to 60 seconds

## [New Actions] - 2023-11-08

- Add favorite actions
- Add copy to clipboard actions
- Add default database action to database list
- Visual improvements, icons and colors

## [New Commands] - 2023-11-05

- Add support for interacting with Kubernetes clusters

## [New Commands] - 2023-11-03

- Add support for searching applications
- Renamed commands

## [Initial Version] - 2023-10-25
