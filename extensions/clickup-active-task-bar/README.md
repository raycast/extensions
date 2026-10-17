# ClickUp Active Task Bar

Stay focused on what you're working on. Keep your current ClickUp task in the macOS menu bar, where it's always in sight. Choose a task from your view, open it, or copy its link without breaking your flow.

## Setup

1. Create a [personal ClickUp API token](https://developer.clickup.com/docs/authentication) and enter it in the extension's **ClickUp API Token** preference. Raycast stores this as a password preference.
2. Enter your **Workspace ID**. This is the number after `app.clickup.com/` in a ClickUp workspace URL.
3. In ClickUp, open the task view you want to use and copy its link into **View ID, URL, or Name**. A full internal URL such as `https://app.clickup.com/123456/v/gr/abcde-123456` is the most reliable choice. A view ID also works, and an exact name can resolve an Everything-level workspace view.
4. Run **Show Active Task** once in Raycast to add it to the menu bar.

The configured view can include tasks from multiple Lists and Spaces. Keep the view filtered to the tasks you want in the menu. Private views work when the token belongs to a ClickUp user with access to them; you do not need to make the view public.

## Using the Menu

- **Open Active Task in Browser** opens your selected task.
- **Go to View** opens the configured ClickUp view.
- **Refresh** updates tasks immediately; Raycast also refreshes every two minutes.
- Open a task submenu to set it as active, copy its link, or open it in the browser.

The menu shows status and due date details, with separate Current Tasks and Done Tasks sections when the view returns both. If the active task leaves the view, the first available task becomes active. If ClickUp is temporarily unavailable, the menu keeps the last successfully fetched tasks.

The extension reads view tasks with your personal token. It does not change tasks or send comments to ClickUp.
