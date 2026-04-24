## ADDED Requirements

### Requirement: User can dispatch a workflow from Raycast
The system SHALL provide a dedicated `Dispatch Workflow` command that lets the user trigger a GitHub Actions workflow using the `workflow_dispatch` event.

#### Scenario: User dispatches a workflow with inputs
- **WHEN** the user selects a repository, a workflow that supports `workflow_dispatch`, a ref, and provides required inputs
- **THEN** the system submits the dispatch request and confirms the workflow was triggered

#### Scenario: User dispatches a workflow without inputs
- **WHEN** the selected workflow supports `workflow_dispatch` and does not require inputs
- **THEN** the system allows the user to trigger the workflow without forcing unnecessary form fields

### Requirement: User can search and choose dispatch targets efficiently
The system SHALL help the user efficiently locate the repository and workflow they want to dispatch.

#### Scenario: User filters workflows during dispatch selection
- **WHEN** the user searches within the dispatch flow
- **THEN** the system filters available repositories or workflows so the user can quickly identify the intended target
