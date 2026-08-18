# Teamwork Extension for Raycast

Search Teamwork tasks and manage your timers, all from Raycast.

## Table of Contents

- [Teamwork Extension for Raycast](#teamwork-extension-for-raycast)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation and Setup](#installation-and-setup)
  - [Using the Teamwork Extension](#using-the-teamwork-extension)
    - [Search Tasks](#search-tasks)
    - [Timer Menu Bar](#timer-menu-bar)
    - [Quick Timer Commands](#quick-timer-commands)

## Introduction

The Teamwork Extension brings your task management and time tracking directly into Raycast. Quickly search for tasks assigned to you, start timers with one keystroke, and monitor your running timer from the macOS menu bar. Perfect for staying focused without leaving Raycast.

## Installation and Setup

1. Install the Teamwork Extension from the [Raycast Store](https://raycast.com/store)
2. Open the extension and you'll be prompted for:
   - **Site URL**: Your Teamwork site (e.g. `https://workspace.teamwork.com`)
   - **API Token**: Get this from your Teamwork profile settings
3. After setup, run the **Teamwork Timer Menu Bar** command once to pin the timer to your menu bar
4. The timer will auto-refresh every 10 seconds when running in the background

## Using the Teamwork Extension

### Search Tasks

Find and manage tasks assigned to you.

**Actions:**

- **Start Timer** Begin timing a task (resumes paused timers automatically)
- **Open in Teamwork** Jump to the task in your browser
- **Copy Task Link** Copy the task URL to clipboard
- **Copy Task Name** Copy the task name to clipboard

**Filters:**

- Switch between **Active** and **Completed** tasks using the dropdown

**Starred Tasks:**

- Star any task to pin it permanently above recents using the **Star Task** action
- Starred tasks persist independently of the recents list
- Use **Remove Star** to unpin a task
- Starred tasks are excluded from the recents section to avoid duplicates

**Recent Tasks:**

- Your recently accessed/timed tasks appear below starred tasks for quick re-access
- Limit controlled by the **Recent Tasks Limit** preference (default: 5)
- **Refresh Task** (`⌘R`) — fetch the latest task data from Teamwork to update name, status, and due date
- **Remove from Recents** (`⌃X`) — remove a task from the recents list

### Timer Menu Bar

Display your running timer in the macOS menu bar with live updates.

**Running timer actions:**

- **Pause Active Timer** Pause the running timer
- **Stop and Log** Complete the timer and create a time entry in Teamwork
- **Open Task** Jump to the running task in Teamwork
- **Search Tasks** Quick access to task search

**Paused timers** are listed below with a submenu for each:

- **Resume** Resume that timer
- **Stop and Log** Complete that timer and log the time
- **Open Task** Jump to the task in Teamwork

### Quick Timer Commands

Speed up your workflow with keyboard-only timer control:

- **Pause Active Timer** Pause the running timer
- **Resume Timer** Shows a list of paused timers — select one to resume
- **Stop and Log Timer** Shows all timers (running and paused) — select one to stop and log
