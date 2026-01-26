# Changelog

All notable changes to the Dex CRM Raycast extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-26

### Added

- **Smart reminder management** with filter by upcoming/overdue/all
- Quick actions for reminders: Mark as done, Snooze (1/3/7 days), Send email
- **List-based navigation** for contact details with keyboard shortcuts
- Phone number actions: Call, SMS, WhatsApp
- **Edit name with smart suggestions** extracted from email addresses
- Quick notes feature with timestamps (Cmd+N)
- Contact notes displayed in sidebar
- **Smart caching** for search (5-minute cache, handles 10,000+ contacts instantly)
- Comprehensive test coverage with Jest
- GitHub Actions CI/CD workflow
- Enhanced documentation (README, CONTRIBUTING)

### Fixed

- Phone number schema bug (phone_number vs phone field)
- API update payload format (contactId + changes wrapper)
- Improved error handling with detailed messages

### Changed

- Improved contact detail layout with navigable rows
- Enhanced reminders view with overdue highlighting
- Better visual hierarchy in all views

## [1.0.0] - 2026-01-21

### Added

- Initial release
- Search contacts by name, email, or job title
- View detailed contact information
- Add new contacts with full details
- Edit existing contacts
- View recent contacts sorted by update date
- Quick actions: send email, copy contact info, open in Dex
- Delete contacts
- Secure API key storage in preferences
- Keyboard shortcuts for common actions
