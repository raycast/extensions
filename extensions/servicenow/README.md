## Overview

The **ServiceNow Raycast Extension** allows you to easily search and explore content across your ServiceNow instances.

## Features

- **Search:** Perform new queries, preview search results, and browse your search history.
- **Efficient Navigation:** Open specific ServiceNow instances or records directly from the command window.
- **Current URL Access:** Open the current ServiceNow URL in another instance.
- **Table Exploration:** Browse and explore the tables in your ServiceNow instance, including their records, definitions, and schema maps (admins only).
- **Quick Login:** Log in to a selected ServiceNow instance using stored credentials in your instance profile.
- **Explore Navigation History:** Browse the list of pages and modules you've previously visited.
- **Manage Favorites:** View and manage your favorite items and groups in ServiceNow.
- **Explore Navigation Menu:** Browse the application menus and modules available in your ServiceNow instance.
- **Search Resources:** Search across various ServiceNow resources, including documentation, blogs, guides, and learning materials.

## Setup Instructions

### 1. ServiceNow Instance Profiles

Before using the extension, you'll need to configure your ServiceNow instance profiles. To do this:

- Use the **Manage Instance Profiles** command to add your ServiceNow instance URL and credentials.
- In the **Instance URL** field, enter the subdomain for a commercial cloud instance (e.g. `acme` → `https://acme.service-now.com`), or the full URL for FedRAMP, on-prem, or custom domains (e.g. `https://gov.servicenowservices.com`, `https://sn.internal.corp`).
- Choose an **Authentication** method per profile:
  - **Basic Auth** — username and password stored locally.
  - **OAuth 2.0 (PKCE)** — see §2 for setup. Tokens are stored locally and refreshed automatically.
- You can add multiple instance profiles and switch between them as needed (⌘+I).

### 2. Configuring OAuth 2.0 (Optional)

OAuth uses a public OAuth client (PKCE) registered in your ServiceNow instance. Tokens are stored locally and refreshed automatically.

> If your instance uses **SSO**, configure the profile with OAuth: basic auth can sign in but can't run the background scripts that power the admin commands (**Find Record by Sys ID**, **Find Record References**), so those commands will fail with a basic-auth profile.

#### Recommended: import the default Raycast OAuth client

1. Download the **Raycast Extension – Default OAuth Client** XML from ServiceNow Share (use the `Download Default OAuth Client` action in the instance profile form).
2. In ServiceNow, navigate to **System OAuth → Application Registry**, open the list menu (☰) on the column header → **Import XML**, and upload the file.
3. In Raycast, open **Manage Instance Profiles**, choose **OAuth 2.0 (PKCE)**, leave the **OAuth Client ID** field empty, and save. The browser will open to complete the sign-in.

#### Alternative: use your own OAuth client

If you prefer to manage your own client:

1. In ServiceNow, navigate to **System OAuth → Application Registry → New → Create an OAuth API endpoint for external clients**.
2. Set: **Public Client** enabled, **PKCE Required** enabled (Code Challenge Method `S256`), **Redirect URL** `https://raycast.com/redirect?packageName=Extension`.
3. Save and copy the generated **Client ID**.
4. In the instance profile form, paste it into the **OAuth Client ID** field.

### 3. Enabling Full Version for Non-Admin Users

The **Raycast Extension – ACLs for Non-Admin Users** update set gives non-admin users full access to the extension's capabilities. It includes ACLs that enable non-admin users to:

- Access their own search history.
- Fully manage their favorites.
- Access their entire navigation history (otherwise limited to a few records).

Use the `Download ACLs for Non-Admin Users` action in the instance profile form, or download directly from [ServiceNow Share](https://developer.servicenow.com/connect.do#!/share/contents/3108109_servicenow_raycast_extension).

#### Steps to install:

1. Navigate to **System Update Sets > Retrieved Update Sets** in your ServiceNow instance.
2. Click **Import Update Set from XML** and upload the file.
3. Commit the update set to enable the functionality.

### 4. Configuring Open Mode Preference

You can configure how ServiceNow pages and records open when using the extension:

- Direct: Open the record or page directly.
- Navigate: Open the page using the ServiceNow navigation system, preserving the classic navigation behavior.
- Service Operations Workspace (SOW): Open lists and records in the modern Service Operations Workspace interface when supported, falling back to the classic navigation otherwise.

To set your preferred mode:

- Go to the Extension Preferences (in Raycast Settings → Extensions → ServiceNow → Preferences).
- Select your preferred option for _Open content using_.

> 💡 By default, the extension uses Direct mode.

### 5. Windows: Reading the Active Browser Tab

Commands that read the URL of your active browser tab (**Open Current Page in Another Instance**, **Add Instance Profile**, **Find Record References**) use AppleScript on macOS and the [Raycast Browser Extension](https://www.raycast.com/browser-extension) on Windows. On Windows, install the Browser Extension in Chrome or Edge for these commands to detect the current tab automatically.
