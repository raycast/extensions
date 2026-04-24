# GitHub Actions

Manage GitHub Actions from Raycast with a focused MVP for high-frequency personal workflows.

## MVP Scope

This extension currently focuses on two commands:

- **Actions Hub**: view recent workflow runs, switch between repositories, and perform quick actions like rerun, rerun failed jobs, cancel, copy run URL, and open runs in GitHub.
- **Dispatch Workflow**: trigger `workflow_dispatch` workflows with ref and dynamic inputs.

## Authentication

Configure a **GitHub Personal Access Token** in Raycast extension preferences.

Recommended permissions:

- Repository read access for repositories, workflows, runs, and jobs
- GitHub Actions write access for rerun, cancel, and workflow dispatch actions

The extension supports fine-grained PATs and classic PATs, but fine-grained tokens are preferred.

## Known Non-Goals

The MVP intentionally does **not** implement:

- secrets or variables management
- permissions or policy management
- self-hosted runner or runner group management
- billing or usage dashboards
- full log viewer or artifact management console
- organization or enterprise control-plane features
