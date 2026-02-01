# Changelog

All notable changes to this extension will be documented in this file.

## [Initial Release] - {PR_MERGE_DATE}

### Added
- Initial release of GitHub Copilot Usage extension
- View current month Copilot Premium usage directly in Raycast
- Display usage percentage with color-coded indicators (green/yellow/red)
- Track requests used vs quota limit based on your Copilot plan
- Show remaining requests for the current billing period
- Reset date countdown showing when quota refreshes
- Support for multiple Copilot plans (Free, Pro, Pro+, Business, Enterprise)
- Detailed usage breakdown by AI model (GPT-4, Claude, etc.)
- Manual refresh functionality to update usage data on demand
- Secure token storage using Raycast preferences
- Copy actions for all metrics (usage percentage, request counts, model stats)

### Security
- GitHub Personal Access Token stored securely via Raycast password field
- Token only requires 'Plan' read permission for billing data access
- No third-party services or external data transmission
