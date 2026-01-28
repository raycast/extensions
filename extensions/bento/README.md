# Bento API Raycast Extension

> [!TIP]
> Need help? Join our [Discord](https://discord.gg/ssXXFRmt5F) or email jesse@bentonow.com for personalized support.

The Bento API Raycast Extension provides a convenient interface to interact with the Bento directly from Raycast. It offers various commands for managing subscribers, viewing reports, and accessing utility features, making it quick and easy to perform Bento operations without leaving your workflow.

# Table of contents

<!--ts-->

- [Features](#features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
   - [Installation](#installation)
   - [Configuration](#configuration)
- [Commands](#commands)
- [Things to Know](#things-to-know)
- [Contributing](#contributing)
- [License](#license)
<!--te-->

## Features

- **Subscriber Creation**: Create subscribers directly from Raycast.
- **Broadcast Insights**: View broadcasts and their open rates quickly.
- **Tag and Field Management**: Access and manage your Bento tags and custom fields.
- **Site Statistics**: Get a quick overview of your Bento site statistics.
- **Custom Dashboard**: Configure and view custom reports in a dashboard format.
- **Utility Features**: Access Bento's utility features like email validation and content moderation.

## Requirements

- Raycast
- Node.js 14+
- Bento API credentials

## Getting started

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/bentonow/bento-raycast-plugin.git
   ```
2. Navigate to the plugin directory and install dependencies:
   ```
   cd bento-raycast-plugin
   npm install
   ```
3. Build the plugin:
   ```
   npm run build
   ```
4. In Raycast, go to Extensions > Add Extension and select the built plugin directory.

### Configuration

1. Open Raycast and go to Extensions > Bento API > Preferences.
2. Enter your Bento API credentials:
   - Site UUID
   - Username (Publishable Key)
   - Password (Secret Key)

## Commands

### View Subscribers

```
Command: View Subscribers
Description: Displays a list of Bento subscribers.
Usage: Run the command to see all subscribers.
```

### Create Subscriber

```
Command: Create Subscriber
Description: Create a new subscriber by entering their email address.
Usage: Run the command, enter the email address, and submit.
```

### View Broadcasts

```
Command: View Broadcasts
Description: Shows a list of Bento broadcasts with their open rates.
Usage: Run the command to see all broadcasts.
```

### View Dashboard

```
Command: View Dashboard
Description: View charts for the configured reports.
Usage: Run the command to see the dashboard with charts for configured reports.
```

### Check Blacklist

```
Command: Check Blacklist
Description: Check if a domain or IP is blacklisted.
Usage: Run the command, enter a domain or IP address, and submit.
```

## Things to Know

1. Ensure your Bento API credentials are correctly configured in the plugin preferences.
2. The plugin requires an active internet connection to communicate with the Bento API.
3. Some commands, like the dashboard view, require additional configuration before use.
4. Utility features are subject to change and may not always be available.
5. For optimal performance, keep the plugin updated to the latest version.

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest improvements.

## License

The Bento API Raycast Extension is available as open source under the terms of the [MIT License](LICENSE).
