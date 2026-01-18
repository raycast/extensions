# Greenhouse Raycast Extension

Browse Greenhouse jobs and applicant pipelines from Raycast.

## Setup
1. Create a Greenhouse Harvest API key with read access.
2. In Raycast, open the Greenhouse extension preferences and set:
   - Harvest API Key (required)
   - Harvest Base URL (optional, default: https://harvest.greenhouse.io/v1)
   - Recruiting Base URL (optional, default: https://s101.recruiting.eu.greenhouse.io)

## Commands
- Greenhouse: browse jobs and pipelines
- Refresh Greenhouse Cache: background refresh task (runs hourly)

## Troubleshooting
- If candidate links 404, update the Recruiting Base URL to your org's recruiting host.
