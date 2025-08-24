# Todoist

**This extension is not created by, affiliated with, or supported by Doist.**

Check your Todoist tasks from within Raycast and quickly create new ones.

## Create Tasks View

You can quickly access your `Home` command favorites views using deep-links and quick-links. Here's how:

1. Open the `Home` command and select your view in the dropdown (e.g `All Tasks` or a specific project)
2. Search for `Create View Quicklink` in the actions (`⌘` + `K`).
3. Give the quicklink a custom name (optional) and create it (`⌘` + `⏎`).
4. Use Raycast root search to find your new quicklink and quickly access your tasks view.

This makes it easy to access any of your views, including projects and labels!

## Disabled Commands

This extension includes a few commands that are disabled by default. You can enable them by going to the extension's settings. These commands are:

- `Create Project`
- `Unfocus Current Task`

## Using the Extension With an API Token

In most cases, you can use OAuth to authenticate with Todoist. You'll be prompted to connect your Todoist account when using any of the extension's commands.

However, if you prefer, you can also use an API token. To do so, you need to retrieve your token from the [integration settings view](https://todoist.com/app/settings/integrations) under the section called **API token**. Copy it and paste in the extension's preferences under **Todoist Token**.
