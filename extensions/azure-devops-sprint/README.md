# Azure DevOps Sprint

Browse and manage the work items of your Azure DevOps sprint without leaving Raycast. Works on macOS and Windows.

## Commands

- **Sprint Work Items**: your current sprint (or any other from the dropdown), in the same order as the Azure DevOps sprint backlog. User Stories come first with their tasks below, each row showing status, estimated and completed hours (story points on User Stories).
- **Search Work Items**: find any work item in the project by number or text.
- **Create Task**: create a Task under a User Story of the chosen sprint.

## What you can do

- Open a work item inside Raycast: description, acceptance criteria, comments (images included), and its related work items, pull requests and commits with their branches
- Change status, add a comment, log hours, move to another sprint
- Group by User Story or status, show only mine or the whole team
- Filter by status: **Show Only Statuses** or **Exclude Statuses**; your choices, the sprint and the grouping are remembered
- Copy the link, the number, `| ID | Title`, or pick a description or comment to copy as Markdown or plain text

Shortcuts use `Cmd` on macOS and `Ctrl` on Windows. Open the action panel to see them all.

## Setup

1. In Azure DevOps, create a Personal Access Token (User settings → Personal access tokens) with **Work Items: Read & Write** and **Code: Read**.
2. Open the extension preferences and fill in:
   - **Organization**: the part after `dev.azure.com/` in your URL
   - **Project** and **Team**: exactly as they appear in Azure DevOps (the team defines the current sprint)
   - **Personal Access Token**

Only Azure DevOps Services (`dev.azure.com`) is supported, not Azure DevOps Server.

## Notes

- **Estimate**: the standard _Original Estimate_ field is shown; if empty, a custom `Custom.EstimatedWork` field is used when present. New tasks save the estimate in the standard field and fall back to the custom one if your process rejects it.
- **Privacy**: your token is stored by Raycast and is only sent to your Azure DevOps organization. Images from descriptions and comments are downloaded to the extension's local support folder so Raycast can display them.
