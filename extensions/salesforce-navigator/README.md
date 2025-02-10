# Salesforce Navigator

Salesforce Navigator is a Raycast extension that brings your Salesforce workflows directly into your Raycast experience. This extension makes it simple and efficient to manage your connected Salesforce orgs, search records across multiple objects, and quickly copy Salesforce record IDs—all without switching context from your desktop.

---

## Features

### 1. List Connected Orgs

- **List Connected Orgs:**  
  The extension retrieves a list of all connected Salesforce orgs using your local Salesforce CLI. Both scratch and non‑scratch orgs are displayed in a dedicated list directly within Raycast.
- **Access Additional Options:**  
  When you select an org, you’re presented with several actions:
  - **Global Search:** Launch a search view that lets you search for records across standard and custom objects.
  - **Open by ID:** Directly open a Salesforce record by entering its ID.
  - **Copy Org Id:** Quickly copy the unique Org ID for later use.
  - **Search Salesforce Users:** Quickly search for Salesforce users.
  - **Other General Options:** Open Home, Developer Console, Object Manager, and more—each action opens the relevant Salesforce page in your browser.

### 2. Global Search

- **Dynamic Record Search:**  
  Use the global search view to enter search terms that will look for matching records across multiple Salesforce objects. Optionally, you can filter the search results by object type.
- **Customizable Search Limits:**  
  Configure the maximum number of search results via the extension preferences to better manage your query results.
- **Filter by Object Type:**  
  Easily filter search results by Salesforce object type to narrow down your results.
- **Browser Integration:**  
  If you’d rather explore results in your web browser, you can launch a native Salesforce Lightning search with a single action.

### 3. Copy SF ID

- **Automatic Tab Scanning:**  
  The extension can scan all your open browser tabs, looking for Salesforce Lightning URLs.
- **Extract Relevant Information:**  
  It extracts the Salesforce record ID, the associated org name, and even fetches a human-readable record name from the page title.
- **Quick Confirmation:**  
  Once you select a record from the list, its ID is copied to your clipboard immediately and you receive a confirmation message.
- **Efficient Switching:**  
  Optionally, you can open the browser tab directly from the extension if you require a deeper dive.

### 4. Salesforce Users

- **List Salesforce Users:**  
  The extension retrieves a list of all Salesforce users from your connected orgs.
- **Access Additional Options:**  
  When you select a user, you’re presented with several actions:
  - **Open User Record:**  
    Open the user’s record in Salesforce.
  - **Login as User:**  
    Login as the user in Salesforce.
  - **Copy User ID:**  
    Copy the user’s ID to your clipboard.
  - **Copy Username:**  
    Copy the user’s username to your clipboard.
  - **Copy Email:**  
    Copy the user’s email to your clipboard.
  - **Copy Alias:**  
    Copy the user’s alias to your clipboard.  
  - **Copy Last Login:**  
    Copy the user’s last login date to your clipboard.
  - **Copy User Role:**  
    Copy the user’s user role to your clipboard.

### 5. Salesforce Objects

- **List Salesforce Objects:**  
  The extension retrieves a list of all Salesforce objects from your connected orgs.
- **Access Additional Options:**  
  When you select an object, you’re presented with several actions:
  - **Open Object Manager:**  
    Open the object manager for the selected object.
  - **Open Object Tab:**  
    Open the tab for the selected object.
  
---

## Prerequisites

- **Salesforce CLI (SFDX):** The extension leverages your local SFDX installation to query and manage Salesforce orgs.
- **SoqlXplorer (optional):** The extension can launch SoqlXplorer with your session.

## Preferences

- **Search Result Limit:**  
  Set your preferred maximum number of search results through the Raycast extension preferences. This is configured in the extension’s settings under "Search Result Limit" (default is 100).