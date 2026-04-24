## 1. Foundation and command structure

- [x] 1.1 Replace the demo `list-actions` command structure with an `Actions Hub` command and add a separate `Dispatch Workflow` command in `package.json`
- [x] 1.2 Create the initial source layout for commands, services, types, and storage helpers used by GitHub Actions features
- [x] 1.3 Add Raycast preferences for GitHub authentication and document the expected token configuration in extension metadata or user-facing help text

## 2. GitHub API and authentication layer

- [x] 2.1 Implement a GitHub API client for workflows, workflow runs, jobs, rerun, cancel, and workflow dispatch endpoints using REST
- [x] 2.2 Implement authenticated request handling with PAT-based authorization and shared error mapping for permission, network, and API failures
- [x] 2.3 Add TypeScript models and response mappers for repositories, workflows, workflow runs, jobs, and dispatch input payloads

## 3. Actions Hub experience

- [x] 3.1 Build the `Actions Hub` list that shows recent workflow runs with the required metadata fields
- [x] 3.2 Add Recent Targets behavior backed by local persistence for recently used repositories and workflows
- [x] 3.3 Add run item actions for rerun workflow, rerun failed jobs, cancel run, open in browser, and copy URL with state-aware availability rules
- [x] 3.4 Build the lightweight run details view with core run metadata, job summary, and GitHub deep link

## 4. Workflow dispatch experience

- [x] 4.1 Build the `Dispatch Workflow` command flow for repository selection, workflow selection, and ref input
- [x] 4.2 Render workflow dispatch inputs dynamically and support workflows that require no inputs
- [x] 4.3 Submit workflow dispatch requests and show clear success or failure feedback in Raycast

## 5. Validation and polish

- [x] 5.1 Verify command flows for missing token, insufficient permissions, unavailable rerun failed jobs, and empty-state scenarios
- [x] 5.2 Run lint/type-check/build validation for the extension and fix any issues introduced by the new command structure
- [x] 5.3 Update README to describe the MVP scope, supported actions, token requirements, and known non-goals
