## Overview

The **ServiceNow Raycast Extension** allows you to easily search and explore content across your ServiceNow instances. With this extension, you can perform quick searches, manage instance profiles, and open specific instances or ServiceNow records in your browser.

## Features

- **Search:** View past searches, perform new queries, and switch between ServiceNow instances.
- **Manage Instance Profiles:** Configure and manage ServiceNow instance profiles for use in search queries.
- **Efficient Navigation:** Open specific ServiceNow instances or records directly from the command window.
- **Current URL Access:** Open the current ServiceNow URL in a different instance (requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension)).
- **Table Exploration:** Navigate and explore tables within your ServiceNow instance.
- **Quick Login:** Quickly log in to your ServiceNow instances.
- **Resources Search:** Access various ServiceNow resources, including documentation, blogs, and guides.

## Setup Instructions

### 1. ServiceNow Instance Profiles

Before using the extension, you'll need to configure your ServiceNow instance profiles. To do this:

- Use the **Manage Instance Profiles** command to add your ServiceNow instance information, including the instance name, username, and password.

### 2. Enabling User Access to Search Terms

To allow non-admin users to view and delete their past search terms, you'll need to install an **Update Set** in your ServiceNow instance.

#### Steps to install:

1. Download the update set [allow*access_to* user_search_terms.xml](<media/allow_access_to_ user_search_terms.xml>).
2. Navigate to **System Update Sets > Retrieved Update Sets** in your ServiceNow instance.
3. Click **Import Update Set from XML** and upload the file.
4. Commit the update set to enable the functionality.
