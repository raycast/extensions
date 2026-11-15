<div align="center">
  <picture>
    <img alt="logo" height="128px" src="assets/icon@dark.png">
  </picture>
  <h1 align="center">GLPI</h1>
</div>

View and manage GLPI Tickets and Followups directly from Raycast. Handle helpdesk requests, update ticket statuses, and collaborate on responses without opening a browser.

> [!NOTE]
> This is not an official GLPI extension and is not affiliated with, endorsed by, or connected to the GLPI project or Teclib' in any way.

## Requirements

- GLPI Server version **11.0** or higher (with REST API v2 enabled)
- An OAuth2 Client configured in GLPI under **Configuration → OAuth clients**:
  - **Grants**: `password` (and `refresh_token`)
  - **Scopes**: `api`
- Valid GLPI user account credentials (username and password)
- The base URL of your GLPI instance (e.g. `https://glpi.example.com/`)

The extension supports both **macOS** and **Windows**.

## How to Use

### Add GLPI Server

On first launch (or via the **Glpi Server** section in the action panel), use **Add Server** to configure a GLPI instance:

- **Name**: Friendly label for the server
- **Endpoint**: Full GLPI base URL (e.g. `https://glpi.example.com/`)
- **Client ID**: The OAuth2 Client ID created in GLPI
- **Client Secret**: The OAuth2 Client Secret
- **Username**: Your GLPI login username
- **Password**: Your GLPI login password

You can add multiple servers and switch between them via **Change Selected Server** in the action panel. Edit or delete servers anytime from the **Edit Server** menu. Authentication tokens are managed securely and refreshed automatically; if a session expires, you will be prompted to re-authenticate.

### Command: Tickets

Browse and inspect GLPI tickets with quick status tracking and rich metadata.

- Filter tickets by status using the search bar dropdown accessory:
  - **New**
  - **Approval**
  - **Processing** (assigned or planned)
  - **Not Solved**
  - **Closed + Solved**
- Search tickets by **ID**, **title**, **category**, or team members (**requester**, **assigned**, or **observer**).
- Toggle **Detail** view to see creation date, solve/close dates, last update, category, status, and team assignments.
- **Show Content**: Read the full ticket description rendered in Markdown.
- **Change Status**: Update ticket status directly (`New`, `Approval`, `Processing`, `Pending`, `Solved`, `Closed`).
- **Show Followups**: View the timeline of followups for the selected ticket.
- Open the ticket directly in the GLPI web UI.

**Keyboard shortcuts** (Tickets):

- `⌘⇧S` / `Ctrl+Shift+S` — Change Status
- `⌘⇧Return` / `Ctrl+Shift+Return` — Show Followups

### Followups View

Accessed from any ticket via **Show Followups** (`⌘⇧Return` / `Ctrl+Shift+Return`).

- Browse timeline followups with author, timestamp, and private status indicator.
- Read full followup content rendered in Markdown.
- **Add Followup** (`⌘N` / `Ctrl+N`):
  - Pre-fill message using configured GLPI **Followup Templates**.
  - Compose responses with Markdown formatting.
  - Update ticket status on submission.
  - Mark followup as **Private** (visible only to technicians).
  - Check **Assign to Me** to assign the ticket to yourself automatically.
  *(Note: Followups cannot be added to solved or closed tickets).*
- Open the ticket in the browser directly from the followups view.

## Common Actions (available in most views)

- Toggle **Detail** view (`Show Detail` / `Hide Detail`)
- **Refresh** data (`⌘R` / `Ctrl+R`)
- **Open in Browser** (`⌘O` / `Ctrl+O`)
- Manage servers (**Add Server**, **Change Selected Server**, **Edit Server**, **Delete Server**) from the action panel
