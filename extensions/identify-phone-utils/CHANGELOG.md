# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Identify Phone Country — instantly identify origin country from any phone number format
- Format Phone Number — multi-format view (E.164, US, RFC 3966, digits only)
- Extract Phone Numbers — extract all phone numbers from selected text or clipboard with country flags
- Look Up Country Code — search ~230 countries by name or dial code, scored by relevance
- Format as US Number — background command to format clipboard number as (XXX) XXX-XXXX
- Remove Formatting — background command to strip all formatting from clipboard number
- All view commands pre-fill from selected text before falling back to clipboard
- `toE164`, `toRFC3966`, `extractPhoneNumbers`, `searchCountries` utility functions
