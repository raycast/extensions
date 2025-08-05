# PurpleAir Changelog

## [Major Enhancement] - 2025-04-28

### New Features
- Added support for multiple sensor indices - now you can monitor several locations at once
- Added support for private sensors with read keys
- Added feature to show the nearest PurpleAir sensor based on user's location
- Added preference toggle to enable/disable the nearest sensor feature
- Added preference for Celsius/Fahrenheit temperature display

### Improvements
- Streamlined sensor data handling for better performance
- Improved navigation between sensor list and detail views
- Enhanced AQI calculation logic
- Updated dependencies to latest versions
- Added corrections for Temperature and Humidity data
  
### Code Quality
- Removed unused interfaces and streamlined code structure
- Added debug logging for troubleshooting API responses
- Refactored data processing for better maintainability

## [Updated Version] - 2023-08-29
PurpleAir updated their map data to use the calculation detailed in this study https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM

This change corrects all the pm values to match the PurpleAir map.

## [Initial Version] - 2022-12-11
