# Windmill

Unofficial Windmill Extension for Raycast – Run flows and scripts directly from Raycast.

# Setup

Before using this extension, set up your workspace by following these steps:

1. **Workspace ID**: Enter your workspace name.
2. **Instance URL**: If you're using a self-hosted environment, enter your URL. Otherwise, leave the default setting.
3. **Access Token**: Create a token through the user settings in windmill.

Use the "Manage Workspaces" command to input your details. Once completed, the "View Flows", "View Scripts", and "View Apps" commands will be usable.

# Commands

1. View Flows
2. View Scripts
3. View Apps
4. View Variables
5. View Resources
6. View Schedules
7. View Folders
8. View Groups
9. View Users
10. Manage Workspaces

(Remember you can hide any of these in raycast's extension settings)

## View Flows / View Scripts

This primary command allows you to list all flows /scripts from your configured workspaces.

### Filters
All Items (Flows, Scripts, Apps, Variables, etc...) can be filtered by workspace using the dropdown menu (CMD + P)

### Actions

- **Open Script/Flow Form** (Enter): Launch the built-in form to initiate a flow.
- **Open Script/Flow** (CMD + O): Access the flow page in the Windmill web interface.
- **Copy Script/Flow URL** (CMD + SHIFT + C): Access the flow page in the Windmill web interface.
- **Edit Script/Flow** (CMD + E): Edit the flow using the Windmill web interface.
- **Open Past Runs**: View previous runs on the Windmill web interface.
- **Add/Remove Star** (CMD + P): Add/Remove Star to the selected item.
- **Refresh** (CMD + R): Bypass the local cache to update your flows list.

### Submit Flow / Script Form
Review and amend all configured fields before executing the flow.

### Actions 
- **Submit Flow**: Commence the flow with the specified data, and then visualize the Result Page.
- **Open Script/Flow** (CMD + O)
- **Edit Script/Flow** (CMD + E)
- **Add/Remove Star** (CMD + P)
- **Open Past Runs**

### Flow / Script Job Result Page
View job information on this page. Once a job finishes, use cmd+enter to copy the outcome to your clipboard.

#### Actions 
- **Open Job** (Enter)
- **Copy Result** (CMD + SHIFT + C): Duplicate the result to your clipboard. (Available only after successful job completion)
- **Open Past Runs**

## View Apps
Utilize this command to enumerate all apps and access them in the Windmill web UI.

### Actions

- **Open App (CMD + O)**: Access the app page in the Windmill web interface.
- **Copy App URL** (CMD + SHIFT + C): Copy the App URL.
- **Edit App** (CMD + E): Access the edit app page in the Windmill web interface.
- **Add/Remove Star (CMD + P)**: Add/Remove Star to the selected item.
- **Refresh (CMD + R)**: Bypass the local cache to update your apps list.




## View Variables

This command allows you to list all variables from your configured workspaces.

### Actions

- **Edit Variable** (CMD + E): Edit the variable using the built-in form.
- **Open In Variables Page** (CMD + O): Access the variables page in the Windmill web interface.
- **Create Variable** (CMD + N): Create a new variable using the built-in form.
- **Refresh List** (CMD + R): Bypass the local cache to update your variables list.

## View Resources

This command allows you to list all resources from your configured workspaces.

### Actions

- **Edit Resource** (CMD + E): Edit the resource using the built-in form.
- **Open In Resources Page** (CMD + O): Access the resources page in the Windmill web interface.
- **Create Resource** (CMD + N): Create a new resource using the built-in form.
- **Refresh List** (CMD + R): Bypass the local cache to update your resources list.

## View Schedules

This command allows you to list all schedules from your configured workspaces.

### Actions

- **Open In Schedules Page** (CMD + O): Access the schedules page in the Windmill web interface.
- **Enable/Disable Schedule**: Toggle the status of a schedule.
- **Refresh List** (CMD + R): Bypass the local cache to update your schedules list.

## View Folders

This command allows you to list all folders from your configured workspaces.

### Actions

- **Open In Folders Page** (CMD + O): Access the folders page in the Windmill web interface.
- **Refresh List** (CMD + R): Bypass the local cache to update your folders list.

## View Groups

This command allows you to list all groups from your configured workspaces.

### Actions

- **Open In Groups Page** (CMD + O): Access the groups page in the Windmill web interface.
- **Refresh List** (CMD + R): Bypass the local cache to update your groups list.

## View Users

This command allows you to list all users from your configured workspaces.

### Actions

- **Open In Users Page** (CMD + O): Access the users page in the Windmill web interface.
- **Refresh List** (CMD + R): Bypass the local cache to update your users list.

## Manage Workspaces

This command allows you to manage your Windmill workspaces.

### Actions

- **Add Workspace** (CMD + N): Add a new workspace.
- **Refresh List** (CMD + R): Bypass the local cache to update your workspaces list.