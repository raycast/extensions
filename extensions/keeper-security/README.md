# Keeper Security Raycast Extension

![Keeper Security Raycast Extension Header](https://images.gitbook.com/__img/dpr=2,width=760,onerror=redirect,format=auto,signature=-129497934/https%3A%2F%2Ffiles.gitbook.com%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-MJXOXEifAmpyvNVL1to%252Fuploads%252Fa5BTzmhaI0rvabqQXJDv%252Fkeeper%252Braycast.png%3Falt%3Dmedia%26token%3D5031f39c-6ef2-4046-9b88-24e0a8ebb27a)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Usage](#usage)
- [Support](#support)

## Overview

A comprehensive [Raycast](https://www.raycast.com/) extension that provides seamless access to your Keeper Security vault directly to your macOS desktop. Manage records, generate secure credentials, and access your vault records without leaving your workflow.

## Features

- **Record Management**: Browse your Keeper vault with a clean, searchable, filterable interface and perform different actions
- **Password Generation**: Generate secure passwords with custom options or instantly with defaults, automatically copied to clipboard
- **Passphrase Generation**: Generate 24-word passphrase, automatically copied to clipboard

## Prerequisites

- **Keeper Commander CLI**: Must be installed and authenticated on your system
- **Keeper Security Account**: Active subscription with vault access (Consumer, B2B, MSP)

## Quick Setup

### Step 1: Install the Keeper Security Extension

You can install the Keeper Security extension directly from the Raycast website:

- https://www.raycast.com/keepersecurity/keeper-security

Or, open **Raycast Settings > Extensions > Click "+" button > Install from Store** and search for "**Keeper Security**".

### Step 2: Install the Keeper Commander CLI

Follow the [Keeper Commander Installation Guide](https://docs.keeper.io/en/keeperpam/commander-cli/commander-installation-setup) to download and install the binary for your operating system. For macOS, you have 2 options:

- [Install the Commander CLI using pip3](https://docs.keeper.io/en/keeperpam/commander-cli/commander-installation-setup/installation-on-mac#python-pip3-installation-method)
- [Install in developer mode](https://docs.keeper.io/en/keeperpam/commander-cli/commander-installation-setup/developer-mode)

### Step 3: Authenticate with Keeper Commander CLI

1. Open your Terminal app.
2. Run the following command: `keeper shell`
3. If you're not already logged in, type `login youremail@company.com` and you'll be asked to enter your Keeper credentials.
4. After login, we recommend activating "**persistent login**" mode:

```bash
this-device register
this-device persistent-login on
this-device timeout 43200
```

There are several other authentication methods, including biometric login. See the [Logging In](https://docs.keeper.io/en/keeperpam/commander-cli/commander-installation-setup/logging-in) documentation for more info.

### Step 4: Start Keeper Commander Service Mode

In order to preserve zero knowledge and provide all of the full Raycast integration capabilities, you need to run the Keeper Commander service on your local machine, or any server that can be accessed over an HTTPS connection. To keep things simple, a quick command for Keeper Commander that is compatible with the Raycast integration looks like this:

```bash
service-create -p 9007 -q n -c "generate,get,list,this-device,sync-down,share,totp,server"
```

This will produce some output like below:

```bash
Generated API key: XXXXXXXXXXXXXX
...
Commander Service starting on http://localhost:9007/api/v1/
...
...
```

After you type this, you'll need to save two pieces of information:

- API URL: This looks like `http://localhost:9007`
- API Key: This looks like `abcdefghi123456==`

> ⓘ Keep the Commander CLI running in order to stay connected

### Step 5. Authenticate the Extension

1. Open **Raycast** using your configured hotkey.
2. Search for **"Keeper Security"** and run any `keeper security` command from the extension.

   If you're not authenticated, the extension will prompt you to enter the **API URL** and **API Key**.

Note: remove `/api/v1` from the API URL, so it looks like below.

![](./media/setup-extension-auth.png)

Setup is now complete.

---

## Usage

Open Raycast using your configured hotkey to run below commands:

- ### `My Vault` Command
  - **Purpose**: View and interact with all your vault records.

  - **Available Actions**:
    - **Show Details** - Displays detailed information about the record.
    - **Open in Browser** - Opens the record directly in the Web Keeper Vault via your browser.
    - **Copy Login** – Copies the username/email to clipboard (if available in the record)
    - **Copy Password** – Copies the password to clipboard (if available)
    - **One-Time Share Record** – Generates a 7-day shareable link for the record
    - **Copy Two Factor Code** – Copies the TOTP code (if available)
    - **Sync Records** – Fetches the latest vault records from the server

- ### `Generate Password` Command
  - **Purpose**: Generate a random password with custom options and automatically copy it to the clipboard.

- ### `Generate Password (Quick)` Command
  - **Purpose**: Generate a random password using default options and automatically copy it to the clipboard.

- ### `Generate Passphrase` Command
  - **Purpose**: Generate a random 24-word passphrase and automatically copy it to the clipboard.

### Restarting the Service Mode

Commander Service Mode needs to be running in order for the Raycast extension to communicate with Keeper. If the Terminal app closes, you can easily start Commander Service Mode using this one-line command from your terminal:

```bash
keeper service-start
```

Assuming that you followed the above [Quick Setup](#quick-setup) instructions, this should immediately login to Keeper and start up the service inside your Terminal app.

## Learn More

This document has covered the basic use cases to integrate Keeper Commander with Raycast. Many more advanced options exist. To learn more, see the below helpful documents:

- [Logging In](https://docs.keeper.io/en/keeperpam/commander-cli/commander-installation-setup/logging-in) to Commander
- [Service Mode REST API](https://docs.keeper.io/en/keeperpam/commander-cli/service-mode-rest-api)

## Support

For support, bugs or feature requests, please email `commander@keepersecurity.com`.
