# AzTU LMS Extension Changelog

## [Fix - New SSO Login] - 2026-11-23

- Updated "Login in Browser" to work with the new AzTU SSO (`newsso.aztu.edu.az`)
- Removed the Class Schedule, Academic Transcript, Attendance, Lectures, Announcements and Profile Information commands
- Removed the Download Path preference, which was only used by Lectures

## [Fix - Login in Browser] - 2026-05-21

- Fixed a problem where `Promise.all()` calls could cause cache loss

## [Fix Color & Add New Image] - 2026-02-28

- Updated the `@raycast/api` dependency.
- Changed the Laboratory lesson color in the schedule from orange to purple.
- Added a new metadata image.

## [Initial Version] - 2026-02-12
