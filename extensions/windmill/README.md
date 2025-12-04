# Windmill

Unofficial Windmill Extension for Raycast - run flows and scripts directly.

## Setup

Before you can use this extension, you need to set up your workspace.

1. **Workspace ID**: Your workspace name.
2. **Instance URL**: Your URL if using a self-hosted environment; otherwise, leave it as the default.
3. **Access Token**: Go to user settings to create a token.

Enter your data using the "Manage Workspaces" command. After this, the "View Flows", "View Scripts", and "View Apps" commands will become functional.

## Flows Command
Use this primary command to list all flows from your configured workspaces.

### Filters
Filter by workspace using the dropdown menu (CMD + P).

### Actions

- **Open Flow Form** (Enter): Open the built-in form to submit a flow.
- **Open Flow** (CMD + Enter): Open the flow page in the Windmill web interface.
- **Edit Flow**: Navigate to the flow edit page in the Windmill web interface.
- **Open Past Runs**: Access past runs in the Windmill web interface.
- **Add/Remove Star**: Add or remove a flow from your favorites in the Windmill UI.
- **Refresh**: Bypass the local cache to re-fetch all your flows.

### Submit Flow Form
View and edit all configured fields before submitting the flow directly from Raycast.

#### Actions 
- **Submit Flow** (CMD + Enter): Submit the flow with the entered data, then display the Result Page.
- **Open Flow** (CMD + Shift + Enter)
- **Edit Flow**
- **Remove Star**
- **Open Past Runs**

### Flow Result Page
Displays a link to the result. To poll for the result and display it in the same window, press CMD + Enter. 

#### Actions 
- **Open Job** (Enter)
- **Poll Result** (CMD + Enter): Wait for the job to finish before displaying the result as text or JSON.
- **Open Past Runs**

## View Scripts Command
Operates similarly to the "Flows Command," but is used for listing and submitting scripts. It supports resources during submission and mirrors the UI of a flow command precisely.

## View Apps Command
Display all apps and open them in the Windmill web UI using this command.
