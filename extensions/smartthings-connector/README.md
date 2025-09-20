# Smartthings Connector Raycast Extension

Welcome to the SmartThings Raycast Extension! This extension allows you to interact with your SmartThings devices directly from Raycast, enabling seamless control and management of your smart home.

## Features

- View and control devices
- Execute scenes
- Toggle device status (e.g., lights, switches)
- View detailed device information

## Requirements

Before using this extension, ensure you have the following:

- Raycast installed on your macOS system.
- SmartThings API key for authentication.
- SmartThings location ID for targeting specific smart home locations.

## Getting Started

### Obtain SmartThings API Key

To use this extension, you'll need to obtain an API key from SmartThings. Follow these steps:

1. **Log in to SmartThings**: Go to the [SmartThings Developer Workspace](https://account.smartthings.com/tokens) and sign in with your Samsung account.

2. **Create a new API token**: Navigate to the "My SmartApps" section and select your app or create a new one. Generate an API token from the "OAuth" section of your app's settings.

3. **Copy the API token**: Once generated, copy the API token. This will be used to authenticate requests from the Raycast extension.

### Obtain SmartThings Location ID

Each location (e.g., home, office) in SmartThings has a unique location ID. Follow these steps to find the location ID:

1. **Log in to SmartThings**: Go to the [My SmartThings website](https://my.smartthings.com/advanced/locations) and log in with your Samsung account.

2. **Find your location**: Navigate to the "Devices" or "Settings" section and select the location you want to manage with this extension.

3. **Retrieve the location ID**: Look for the location ID in the URL or in the settings of your selected location. It typically appears as a string of alphanumeric characters.

Certainly! Here's an updated version for the README section on setting preferences using the Raycast extension UI:

---

## Set Preferences

To configure the SmartThings API token (`apiToken`) and location ID (`locationId`) within the Raycast extension UI, follow these steps:

1. **Open Raycast**: Launch Raycast on your macOS system.

2. **Access Preferences**: Type `Extensions` into the Raycast command bar and search for "SmartThings Connector" in the list.

3. **Enter API Token**: In the preferences window, enter your SmartThings API token (`apiToken`). This token is required for authenticating API requests to SmartThings.

4. **Enter Location ID**: Enter your SmartThings location ID (`locationId`). This ID specifies the SmartThings location you want to interact with using the extension.

5. **Save**: The Changes are saved automatically.

Now, the extension is configured to use your specified API token and location ID for seamless interaction with your SmartThings devices and scenes.

## Feedback

Your feedback is highly appreciated! If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/4IngoJ/SmartthingsConnector_for_Raycast) on GitHub.
