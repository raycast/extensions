## ADDED Requirements

### Requirement: User authenticates with a GitHub personal access token
The system SHALL use a GitHub Personal Access Token configured in Raycast preferences to authenticate all GitHub Actions API requests.

#### Scenario: User provides a valid token
- **WHEN** the user configures a valid GitHub token in extension preferences
- **THEN** the system uses that token for GitHub Actions API requests

#### Scenario: User has not configured a token
- **WHEN** the user opens a command that requires GitHub authentication without a configured token
- **THEN** the system instructs the user to configure a token before continuing

### Requirement: System communicates permission failures clearly
The system SHALL provide explicit error feedback when the configured token lacks the permissions required for a requested action.

#### Scenario: Token lacks write permission for rerun or cancel
- **WHEN** the user attempts rerun, rerun failed jobs, cancel, or dispatch with a token that lacks required permissions
- **THEN** the system reports that the action failed because of insufficient token permissions and indicates that broader GitHub Actions permissions are required
