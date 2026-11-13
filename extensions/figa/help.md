# Connect Figa

1. Open your Figa workspace and go to **Settings → API keys**. Free includes one shared API key or MCP connection slot per organization, with access to the oldest 20 expenses per month across the organization. Pro removes these limits.
2. Create a dedicated key for Raycast. Use the **read** preset to browse expenses, categories, recipients and monthly summaries. Use the **write** preset only if you also want to create expenses or change payment status.
3. Paste the key into the **API Key** field and save. Run **Show Workspace Context** to check the selected workspace and permissions.

Tag lookup, tag names on expenses and the tag picker require **tags.read**. Existing tags can be assigned when creating an expense with **expenses.write**; create and manage tags in Figa. The context screen shows API key permissions, which can include operations without a dedicated Raycast command.

Each key belongs to one workspace. To switch workspaces, replace the key in the extension preferences with one created for the other workspace.

Keep the key private. Do not include it in screenshots or support messages. You can revoke it in Figa's API key settings.

[Setup guide and available commands](https://getfiga.com/help/developers/integrations/raycast)
