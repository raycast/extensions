<div align="center">
<img
   src="./assets/kaneo.png"
   alt="Kaneo for Raycast"
   width="128"
/>

# Kaneo For Raycast

⚠️ **This extension is not created by Kaneo developers.**


<a href="https://www.raycast.com/Baldy/kaneo-for-raycast" title="Install kaneo-for-raycast Raycast Extension"><img src="https://www.raycast.com/Baldy/kaneo-for-raycast/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt="" /></a>

[![Raycast](https://img.shields.io/raycast/dt/Baldy/kaneo-for-raycast?color=%23FF6363&logo=raycast)](https://www.raycast.com/Baldy/kaneo-for-raycast)

***"All you need. Nothing you don't."***<br>
***[Kaneo](https://kaneo.app) is project management that stays out of your way.***
</div>

## Features

- **Browse Projects**: View all your Kaneo projects with task counts and completion percentages
- **Create Task**: Create a new task from Raycast
- **Browse Notifications**: View all your Kaneo notifications
- **Task Management**: Organize tasks by status columns (Backlog, To Do, In Progress, In Review, Done)
- **Status Updates**: Change task status with keyboard shortcuts
- **Priority Sorting**: Sort tasks by priority (urgent → high → medium → low) or due date
- **Quick Actions**: Copy task titles, descriptions, and open tasks in your web browser
- **Visual Indicators**: Color-coded priorities and due date warnings
- **Project/Task Deletion**: Remove projects and tasks with confirmation dialogs
- **Search**: Filter projects by name or description

## Installation

### From Raycast Store

1. Open Raycast Store
2. Search for "Kaneo"
3. Click Install

### From Source

1. Clone the repository `git clone https://github.com/MonsPropre/kaneo-for-raycast.git`
2. Go to the project directory `cd kaneo-for-raycast`
3. Install dependencies `npm install`
4. Start the extension `npm run dev`
5. Play with the extension 😊

## Configuration

Before using the extension, you need to configure the following preferences:

| Preference                                                                    | Description                                   | Required | Default                 |
|-------------------------------------------------------------------------------|-----------------------------------------------|----------|-------------------------|
| **Instance URL**                                                              | Your Kaneo instance API URL                   | Yes      | https://cloud.kaneo.app |
| **Web Instance URL**                                                          | Your Kaneo instance Client URL                | Yes      | https://cloud.kaneo.app |
| **Workspace ID**                                                              | Your Kaneo workspace ID                       | Yes      | N/A                     |
| [**API Token**](https://cloud.kaneo.app/dashboard/settings/account/developer) | Your authentication token                     | Yes      | N/A                     |
| **User ID**                                                                   | Your user ID (for task assignments)           | No       | N/A                     |
| **Sort**                                                                      | Default sorting method (Priority or Due Date) | Yes      | Priority                |


### Get your Kaneo Instance URL
- For Cloud instance: https://cloud.kaneo.app
- For Self-Hosting instance:
   - https://api.your-instance-url (KANEO_API_URL)
   - https://web.your-instance-url (KANEO_CLIENT_URL)

### Obtain the API Token for your Kaneo instance
- Go to your Kaneo instance
- Navigate to Settings (Profile Icon → Settings) → API Keys
- Create API Key
- Give a name to the API Key
- Select an expiration date
- Press Create
- Copy the key to Raycast preferences

**⚠️ The key will be visible only once, You won't be able to see it again.**

## Usage

### Viewing Projects

1. Open Raycast
2. Search for "List Projects"
3. Browse your projects with task counts and completion stats

### Managing Tasks

1. Select a project to view its tasks organized by columns
2. Press **Enter** to view task details
3. Use keyboard shortcuts for quick actions:
   - **⌘⇧S** - Change task status
   - **⌘⇧T** - Copy task title
   - **⌘⇧D** - Copy task description

### Changing Task Status

1. Select a task
2. Press **⌘⇧S** to open the status menu
3. Choose the new status with keyboard shortcuts:
   - **⌘⇧T** - To Do
   - **⌘⇧P** - In Progress
   - **⌘⇧R** - In Review
   - **⌘⇧D** - Done

## Visual Indicators

### Priority Colors

- 🔴 **Urgent** - Red
- 🟠 **High** - Orange
- 🟡 **Medium** - Yellow
- 🔵 **Low** - Blue
- ⚪ **No Priority** - Gray

### Due Date Colors

- 🔴 **Overdue** - Past the due date
- 🟠 **Upcoming** - Due within 3 days
- 🟢 **On Track** - Due later than 3 days

### Requirements
- Raycast app
- Kaneo instance >=2.1.5 with API access (Cloud instance work)