# 2Do

Add, browse, and edit [2Do](https://www.2doapp.com) tasks from Raycast.

> **Note**: This is a community extension. It is not made, endorsed, or supported by Beehive Innovations, the developer of 2Do.

## Requirements

- macOS with the 2Do Mac app installed (direct download or Setapp).
- A 2Do version that includes the AppleScript Automation Suite. Tested with 2Do 2026.4.3. With an older 2Do, commands say to update it.

## Setup

The first time a command talks to 2Do, macOS asks whether Raycast may control 2Do. Click **Allow**.

If you clicked **Don't Allow**, turn it back on in **System Settings → Privacy & Security → Automation → Raycast → 2Do**.

## Commands

### Add Task

Create a task with a title, notes, action, list, start and due dates (with optional times), priority, star, and tags.

Check **Repeat** to make the task repeat: daily, on weekdays, weekly (optionally on chosen days), monthly (optionally on, say, the second Tuesday), yearly, or every so many days, weeks, months or years. Choose whether it repeats from the due date or from when you complete it, and whether it ends after a number of times or on a date. A repeating task with no start or due date starts today.

For tags not in 2Do yet, type their names in **New Tags**, separated by commas. Saving creates them in 2Do. A name that matches an existing tag, in any letter case, uses that tag instead of creating another.

A **Type** field makes the new task a project or checklist instead. If the list has projects or checklists, a **Project or Checklist** field puts the task inside one of them. In Edit Task, picking one moves the task in. Projects and checklists themselves aren't offered the field, because 2Do turns a project or checklist put inside another into a normal task.

The action is 2Do's one-tap task action: **Link** (a URL), **Call** or **Message** (a phone number), **Email** (an address), **Visit** (a place, opened in Maps), or **Google** (search terms). Edit Task changes or removes it.

### Add Link

Enter a web address and continue to the task form, with the address as the title. Check **Read page title and description** to read the page first: the task form then opens with the page title as the task title and the page's description (if it has one) in the notes. The checkbox remembers its last setting.

Some sites (Goodreads, for example) block automated reading. Keep a browser open with the [Raycast browser extension](https://www.raycast.com/browser-extension) (Raycast Companion) installed and enabled to get past those blocks. If reading fails, a toast says why.

Either way, the task form opens with the address as the task's Link action, so 2Do can open it. Saving returns to the cleared Link step for the next address.

### View Tasks

Browse tasks by scope: All, Today, Starred, Scheduled, Done, any list, or any smart list. Type to filter by title, notes, tag, or link.

Projects show a folder icon, and checklists a checklist icon. Open ones show their items' progress as a ring and "3/6". Completing one with open items (⌘D) asks first, since 2Do completes them too. **Show Items** (⌘I) lists a project's or checklist's items, which 2Do's other views in Raycast don't show, with the usual task actions. **Add Item** (⌘N), on the project or checklist or inside Show Items, adds one. A checklist's child tasks have no dates, though the checklist itself, and a project and its children, can. Repeating tasks show a repeat icon whose tooltip gives the rule, like "Every 3 days" or "Weekly on Mon, Fri".

⌘L runs the task's 2Do action: it opens the link, calls or messages the number (through FaceTime or Messages), starts an email, opens the place in Maps, or searches Google. A task with no action opens the first link in its notes instead. An icon shows which kind of action a task has. Choose Link lists every link, from the action and the notes.

| Action                              | Shortcut |
| ----------------------------------- | -------- |
| Edit Task                           | ↵        |
| Run Action (or open the first link) | ⌘L       |
| Choose Link (2 or more)             | ⇧⌘L      |
| Complete / Mark as Not Done         | ⌘D       |
| Show Items (projects, checklists)   | ⌘I       |
| Add Item (projects, checklists)     | ⌘N       |
| Star / Unstar                       | ⌘.       |
| Open in 2Do                         | ⌘O       |
