# Timely

Manage your [Timely](https://timelyapp.com) projects directly from Raycast.

## Features

- **Search Projects** – Quickly find and filter your Timely projects
- **Open in Browser** – Jump to any project in Timely with one keystroke
- **Create Projects** – Create new projects without leaving Raycast

## Setup

This extension requires you to create an OAuth app in Timely:

1. Go to **Timely → Settings → Devs** and create a new OAuth application
2. Set the **Redirect URI** to:
   ```
   https://raycast.com/redirect?packageName=Extension
   ```
3. Copy the **Client ID** and **Client Secret**
4. Open Raycast Preferences (`⌘ + ,`) → Extensions → Timely
5. Enter your Client ID and Client Secret

## Usage

- **Search Projects** – Search and open your Timely projects
- **Create Project** – Create a new project with a name and client

## Troubleshooting

**"Successfully connected" but extension still shows sign-in prompt**
Make sure to click the "Open Raycast" button on the success page after authorizing.

**"Invalid client" error**
Double-check that your Client ID and Client Secret in Raycast Preferences match exactly what's shown in your Timely OAuth app.
