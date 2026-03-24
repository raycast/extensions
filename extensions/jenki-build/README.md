# JenkiBuild

Trigger Jenkins builds from Raycast without leaving the keyboard.

## Features

- Browse and search all Jenkins jobs with instant cached results
- Trigger parameterized builds with dynamic form controls
- View build history for recently triggered builds
- Favorite frequently used jobs for quick access
- See build status, last build number, and relative timestamps

## Setup

### Prerequisites

- [Raycast](https://raycast.com) installed on macOS
- A running Jenkins instance (version 2.96+ recommended)
- A Jenkins API token (not your Jenkins login password)

### Generating a Jenkins API Token

1. Log in to your Jenkins instance
2. Click your username in the top-right corner
3. Click **Configure** (or navigate to `/user/<your-username>/configure`)
4. Scroll down to the **API Token** section
5. Click **Add new Token**, give it a descriptive name (e.g., "Raycast"), then click **Generate**
6. Copy the token immediately — it will not be shown again

### Extension Preferences

| Preference           | Required | Description                                                             |
| -------------------- | -------- | ----------------------------------------------------------------------- |
| **Jenkins URL**      | Yes      | Base URL of your Jenkins instance (e.g., `https://jenkins.example.com`) |
| **Username**         | Yes      | Your Jenkins username                                                   |
| **API Token**        | Yes      | The API token generated above (stored securely, masked in UI)           |
| **Default Job Path** | No       | Optional job path to pre-select when opening the extension              |

## Usage

### Trigger Build

1. Open Raycast and search for "Trigger Build"
2. Browse or search for a Jenkins job
3. Select a job to open the build parameter form
4. Fill in parameters (if any) and submit to trigger the build
5. A success toast confirms the build with a link to open it in Jenkins

### Build History

1. Open Raycast and search for "Build History"
2. View your last 20 triggered builds with status and timestamps
3. Select a build to open it in Jenkins, or re-trigger the same job
