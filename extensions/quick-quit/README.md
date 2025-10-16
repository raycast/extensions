# Quick Quit

A Raycast extension to instantly quit custom groups of applications, streamlining your workflow and helping you regain focus.

![Quick Quit Demo](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHVseWZleXMwaXYxMHU1andtZHJ2cGpmOG82MDU1aXRudXp4cjlqZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6lEPSmyTQ5sRnIM9EG/giphy.gif)

*(A GIF demonstrating the core functionality: creating and editing a category. Using the Quit Applications command to quit a category. Creating a Quicklink and using it to quit apps.)*

## Overview

Quick Quit is a power-user utility designed to reduce context switching and manage workspace clutter. Instead of quitting applications one by one, you can define logical groups (e.g., "Work", "Design", "Social") and quit all apps in a group with a single command or a dedicated hotkey.

It's built to be fast, smart, and deeply integrated with Raycast's best features, like Quicklinks.

## Features

-   **Custom Categories:** Create your own personalized groups of applications to fit your unique workflows.
-   **Smart Pre-built Categories:** Comes with "Dev" and "AI" categories that intelligently show only the apps you have installed.
-   **Active Category List:** The main `Quit Applications` command only shows categories that have at least one application currently running, providing a clean, actionable list.
-   **Hotkey Support via Quicklinks:** Create a unique, system-wide hotkey for any category using Raycast's native Quicklink system.
-   **Full Category Management:** A dedicated interface to create, edit, and delete your custom categories.
-   **Application Viewer:** See exactly which of your apps belong to a category, separated into "Installed" and "Not Installed" lists.

## Commands

Quick Quit provides three main user-facing commands:

| Command | Description |
| :--- | :--- |
| **Quit Applications** | The primary action command. Displays a list of *only your active categories* (those with apps currently running). Select a category to quit all its running apps. |
| **Create Category** | The entry point for creating a new custom category. Opens a form to name your category and select applications. |
| **Manage Categories** | The central hub for managing your setup. View all custom and default categories. From here, you can **Edit**, **Delete**, and **Create Quicklinks** for your categories. |

*(There is also a hidden `execute-quit` command that is used internally to power the Quicklinks.)*

## How to Use

### 1. Create Your First Category

1.  Run the **`Create Category`** command in Raycast.
2.  Give your category a name (e.g., "AI Research").
3.  Use the "Applications" tag picker to select all the apps that belong to this group (e.g., ChatGPT, Claude, Wispr Flow).
4.  Submit the form (`⌘ + ↵`).

### 2. Create a Hotkey (via Quicklink)

This is the most powerful feature of Quick Quit.

1.  Run the **`Manage Categories`** command.
2.  Highlight the category you want to create a shortcut for.
3.  Open the Actions menu (`⌘ + K`) and select **"Create Quicklink"**.
4.  Raycast's native "Create Quicklink" window will appear, pre-filled with the correct name and link. Simply save it.
5.  Now, open Raycast's main **Preferences** (`⌘ + ,`), go to the **Quicklinks** tab, find the Quicklink you just created, and assign a hotkey to it.

You can now trigger this hotkey from anywhere in macOS to instantly quit all apps in that category.

### 3. Quit an Active Category

You have two ways to quit:

1.  **Use a Hotkey:** Trigger the hotkey you created in the previous step for instant action.
2.  **Use the List:** Run the **`Quit Applications`** command. This will show you a list of only the categories that are currently active. Select one and press `Enter`.

---

**Author:** [sriramHQ](https://sriram.fun)
**License:** MIT