# Delivery Tracker Changelog

## [FedEx Delivery Date Bug Fix] - 2025-03-07

Fixed a bug for the delivery date from FedEx.  People living in timezones with a negative UTC offset incorrectly saw
delivery dates a day earlier for FedEx.  This has been fixed.

FedEx and UPS carrier parsing was improved to support additional packages per tracking number.

## [Initial Release] - 2025-03-04

Tracks deliveries, packages, and parcels.

Has two commands to start: one to add a new delivery and one to view all the deliveries you're tracking.

Has initial support for the following carriers...
- UPS.
- FedEx.
- USPS.
