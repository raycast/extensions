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

- Use the **Manage Instance Profiles** command to add your ServiceNow instance name and credentials.
- You can add multiple instance profiles and switch between them as needed (⌘+I).

### 2. Enabling User Access to Search Terms

To allow non-admin users to view and delete their past search terms, you'll need to install an **Update Set** in your ServiceNow instance.

#### Steps to install:

1. Download the following update set from ServiceNow Share: [ACLs for Raycast Extension](https://developer.servicenow.com/connect.do#!/share/contents/3108109_servicenow_raycast_extension).
2. Navigate to **System Update Sets > Retrieved Update Sets** in your ServiceNow instance.
3. Click **Import Update Set from XML** and upload the file.
4. Commit the update set to enable the functionality.

### 3. Configuring Open Mode Preference

You can configure how ServiceNow pages and records open when using the extension:

- Direct: Open the record or page directly.
- Navigate: Open the page using the ServiceNow navigation system, preserving the classic navigation behavior.
- Service Operations Workspace (SOW): Open lists and records inside the modern Service Operations Workspace interface, when possible; otherwise, it falls back to the classic navigation.

To set your preferred mode:

- Go to the Extension Preferences (in Raycast Settings → Extensions → ServiceNow → Preferences).
- Select your preferred option for _Open content using_.

> 💡 By default, the extension uses Direct mode.
