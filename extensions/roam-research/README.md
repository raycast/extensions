# Roam Research

Your Roam graphs at your fingertips! Quickly search, capture and navigate your Roam graphs.

Please report any issues to support@roamresearch.com

## Supported Functionality
1. **Search** across all your graphs at once, or within a specific graph
2. **Quick Capture** notes to your Roam graph without leaving your keyboard. Supports capture templates with customizable page, nesting, tags, and content format.
3. **Instant Capture** with a single keystroke (no UI) using your designated capture template
4. **Manage Capture Templates** to create reusable presets for different capture workflows (daily notes, TODOs, meeting notes, etc.). Designate one as your Instant Capture template.
5. **Random Note** to surface a random block from your graph
6. **Create Graph Quicklink** to build Raycast quicklinks that open Roam graphs or specific pages
7. **Graph Reordering** to control which graph appears first across all commands (Move Up/Down)
8. **Capture Outbox** to view capture history and automatically retry failed captures (offline resilience)

**DEMO VIDEO**: https://www.loom.com/share/3fa11c532cb44822a047caecc638e47f


## Getting Started / Setting up a graph

To get started with this extension, you need to set up a Roam Research graph via the "Add Graph" Raycast command.

You can follow the steps listed below or follow along with the following video: https://www.loom.com/share/31ada35f7c8b4f44a2ba537b15237854

1. First of all, you need to get an API token for the graph. To get it, open the graph from https://roamresearch.com/#/app
2. Then go to ... > Settings > "Graph" tab > "API Tokens" section and click on the "+ New API Token" button.
    - If you do not see the "API Tokens" section, there are a few possibilities:
        - You might be on an older version of Roam. Please refresh/restart the tab/desktop app and click on ... > check for updates.
        - You might not be the owner of the graph (Only graph owners can create API Tokens)
3. Add a description making it clear that this will be used by the Raycast extension. Choose an "Access Scope" based on what you need:
    - **read** -- Enables search and random note. Does not support capture.
    - **append** -- Enables Quick Capture only. This is the only option for encrypted graphs.
    - **edit** -- Enables all features: search, capture, and random note. Recommended for most users.
    - The extension auto-detects your token's capabilities on setup and shows what's available.
4. In the "New Token Generated!" dialog, copy the API Token using the copy to clipboard button
5. Then trigger the "Add Graph" Raycast command and add the graph name and copied token to the form. Submit pressing the button or using Cmd+Enter

### Encrypted Graphs

Encrypted graphs are supported for Quick Capture via the Append API. Search and Random Note require an unencrypted graph (Roam's Backend API limitation). When setting up an encrypted graph, use an append-scoped token.

#### Screenshot of API Tokens Settings Section
This is how the "API Tokens" section in Graph Settings looks like
![API Tokens Settings Section](./media/api-tokens-settings.png)
