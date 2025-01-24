# Fake Data Generator Changelog

## [Improved Architecture and State Management] - 2024-12-30

- Refactored project architecture for better modularity and maintainability.
  - Split logic.
  - Organized the project into clearer folder structures (`helpers`, `components`, `store`, etc.).
- Integrated RXJS to manage application state between the menu bar and the main panel dynamically.
- Implemented combined observables to handle multiple state streams effectively.

## [API Enhancements and Reliability] - 2024-12-30

- Updated the address generation API for better accuracy and reliability.
- Improved error handling and retry logic in address fetching with `axios`.
- Switched to a dynamic age-based minor/major date generation algorithm for better realism.

## [Enhanced User Experience] - 2024-12-30

- Added toast notifications throughout the app to indicate success and failure of actions (e.g., data regeneration, address fetching).
- Improved the edit form:
  - Added dynamic age calculation displayed alongside the date of birth.
  - Enabled quick toggling between minor and major date presets with checkboxes.
  - Manual edits override checkbox selections, enhancing user control.

## [Menu Bar Integration] - 2024-12-20

- Added a menu bar icon to display generated fake data.
- Enabled actions to copy individual data items directly from the menu bar.
- Implemented a "Regenerate Data" action within the menu bar.

## [Enhanced Data Generation Features] - 2024-12-20

- Improved random address generation with more realistic street numbers.
- Added clipboard copy feedback for each item (e.g., name, DOB, address).
- Improved reliability of API calls for generating random addresses.

## [Initial Release] - 2024-12-10

- Introduced the extension for generating realistic French fake data.
- Features include:
  - Random name and gender generation.
  - Date of birth generation for minors and adults.
  - French Social Security Number (SSN) generator based on DOB.
  - Random IBAN and BIC details.
  - Random French address generation using external API.
- Added a detailed view for modifying and regenerating data within Raycast.
