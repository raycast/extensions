# n8n for Raycast

Search, manage, and trigger n8n workflows and webhooks directly from Raycast.

## Setup

To use this extension, you need to connect it to your n8n instance:

1.  Open Raycast Preferences (you can search for the command `Extensions` in Raycast).
2.  Navigate to the `Extensions` tab.
3.  Find the "n8n" extension in the list.
4.  Enter your n8n connection details:
    *   **n8n Instance URL:** Your full n8n instance URL.
        *   For n8n cloud: `https://YOUR_SUBDOMAIN.app.n8n.cloud`
        *   For self-hosted: `https://n8n.yourdomain.com` (or including the port if necessary, e.g., `http://localhost:5678`)
    *   **n8n API Key:** Your n8n API key. You can generate one in your n8n instance under `Settings > API keys`. See the [n8n documentation](https://docs.n8n.io/api/authentication/#create-an-api-key) for detailed instructions.
5.  Optionally, configure the "Remember Workflow Tag Filter" preference.

## Features / Commands

This extension provides the following commands:

*   **Search Workflows:**
    *   Search through all your n8n workflows.
    *   Filter workflows by tags (you can choose to remember the last used filter via preferences).
    *   View workflow details (ID, creation/update times, tags).
    *   Open workflows in your n8n instance.
*   **Search Triggerable Webhooks:**
    *   Find workflows that are active and start with a Webhook trigger node.
    *   Filter these workflows by tags.
    *   Trigger a workflow's webhook directly, optionally providing JSON body, query parameters, or headers.
    *   Save frequently used webhook trigger configurations as new "Saved Commands".
*   **Run Saved n8n Command:**
    *   Quickly access and run your previously saved webhook trigger configurations.
*   **Reset n8n Extension Storage:**
    *   Clears all locally stored data for this extension (like saved commands and remembered filters). Use this if you encounter persistent issues.

## Screenshots

*   **Search Workflows:**
    ![Search Workflows](assets/screenshots/CleanShot%202025-04-15%20at%2011.17.18@2x.png)
*   **Search Triggerable Webhooks:**
    ![Search Webhooks](assets/screenshots/CleanShot%202025-04-15%20at%2011.17.37@2x.png)
*   **Trigger Webhook Form:**
    ![Trigger Form](assets/screenshots/CleanShot%202025-04-15%20at%2011.17.46@2x.png)

## Limitations

*   The "Search Workflows" command does not support arbitrary execution of workflows that do not start with a webhook trigger.
*   Webhook triggering requires the target workflow to be active and have a Webhook node as its starting point.

## Recent Enhancements

*   **Cloud and Self-Hosted Support:** The extension now supports both cloud and self-hosted n8n instances.
*   **Improved Webhook Filtering:** Added enhanced filtering capabilities for triggerable workflows.
*   **Query Parameters for Saved Workflows:** You can now save triggerable workflows with query parameters for repeated use.