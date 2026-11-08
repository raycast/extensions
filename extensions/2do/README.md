# 2Do

Add, browse, and edit [2Do](https://www.2doapp.com) tasks from Raycast.

> [!NOTE]
> This is a community extension. It is not made, endorsed, or supported by Beehive Innovations, the developer of 2Do.

## Requirements

- macOS with the 2Do Mac app installed (direct download or Setapp).
- A 2Do version that includes the AppleScript Automation Suite. Tested with 2Do 2026.4.3.

## Setup

The first time a command talks to 2Do, macOS asks whether Raycast may control 2Do. Click **Allow**.

If you clicked **Don't Allow**, turn it back on in **System Settings → Privacy & Security → Automation → Raycast → 2Do**.

## Commands

### Add Task

Create a task with a title, notes, action, list, start and due dates (with optional times), priority, star, and tags. The list you pick is remembered for next time.

The action is 2Do's one-tap task action: **Link** (a URL), **Call** or **Message** (a phone number), **Email** (an address), **Visit** (a place, opened in Maps), or **Google** (search terms). Edit Task changes or removes it.

### Add Link

Enter a web address and continue to the task form, with the address as the title. Check **Read page title and description** to read the page first: the task form then opens with the page title as the task title and the page's description (if it has one) in the notes. The checkbox remembers its last setting.

Some sites (Goodreads, for example) block automated reading. Keep a browser open with the [Raycast browser extension](https://www.raycast.com/browser-extension) (Raycast Companion) installed and enabled to get past those blocks. If reading fails, a toast says why.

Either way, the task form opens with the address as the task's Link action, so 2Do can open it.

### View Tasks

Browse tasks by scope: All, Today, Starred, Scheduled, Done, any list, or any smart list. Type to filter by title, notes, tag, or link.

⌘L runs the task's 2Do action: it opens the link, calls or messages the number (through FaceTime or Messages), starts an email, opens the place in Maps, or searches Google. A task with no action opens the first link in its notes instead. An icon shows which kind of action a task has. Choose Link lists every link, from the action and the notes.

| Action                                 | Shortcut |
| -------------------------------------- | -------- |
| Edit Task                              | ↵        |
| Run Action (or open the first link)    | ⌘L       |
| Choose Link (2 or more)                | ⇧⌘L      |
| Complete / Mark as Not Done | ⌘D       |
| Star / Unstar               | ⌘.       |
| Open in 2Do                 | ⌘O       |
