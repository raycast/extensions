## ADDED Requirements

### Requirement: User can view recent workflow runs in a unified hub
The system SHALL provide an `Actions Hub` command that displays recent GitHub Actions workflow runs for the user's selected or recent repositories, with enough contextual information to support action decisions.

#### Scenario: Hub shows recent runs with essential metadata
- **WHEN** the user opens the `Actions Hub` command after configuring a valid GitHub token
- **THEN** the system shows recent workflow runs including workflow name, repository, branch, status or conclusion, event, actor, and started time or duration

#### Scenario: Hub prioritizes recent targets
- **WHEN** the user has previously interacted with repositories or workflows
- **THEN** the system surfaces recent repositories or recent workflow targets before or alongside the main run list

### Requirement: User can perform high-frequency run actions from the hub
The system SHALL allow the user to invoke high-frequency workflow run actions directly from each run item without leaving the main hub flow.

#### Scenario: User reruns a workflow from a run item
- **WHEN** the user selects rerun on a workflow run that supports rerun
- **THEN** the system triggers a rerun for that workflow run and confirms the action result

#### Scenario: User reruns failed jobs from a run item
- **WHEN** the user selects rerun failed jobs on a workflow run that supports rerunning failed jobs
- **THEN** the system triggers rerun of failed jobs and confirms the action result

#### Scenario: User cancels an active run from a run item
- **WHEN** the user selects cancel on a workflow run in a running or queued state
- **THEN** the system sends a cancel request and confirms the action result

### Requirement: User can open lightweight run details before acting
The system SHALL provide a lightweight details view for a workflow run to help the user confirm the target before performing an action.

#### Scenario: User views minimal details for a run
- **WHEN** the user opens the details action for a workflow run
- **THEN** the system shows core run metadata, a lightweight job summary, and a link to open the run in GitHub
