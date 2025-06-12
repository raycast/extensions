# ToDoist - Done List

A simple extension that shows your completed Todoist tasks for the day, so you can focus on what you've accomplished, not what you have left.

While Todoist is great at managing your tasks, it doesn't make it easy to review what you've actually completed. Your completed tasks are hidden behind several clicks, and there's no simple way to see your daily accomplishments at a glance. Even the official Todoist extension for Raycast only shows active tasks - there's no way to see what you've completed. This extension fills that gap by providing a dedicated view of your completed tasks, helping you track your progress and celebrate your achievements.

## Features

- **Daily View**: See all tasks you've completed today, organized by project
- **Project Organization**: Tasks are grouped by project with task counts and points
- **Priority Indicators**: Visual indicators show task priorities (from red for high priority to gray for low)
- **Personal Focus**: Only shows tasks you completed (excludes shared/group tasks)
- **Task Links**: Click any task to open it in either the Todoist app or browser
- **Points Tracking** (also known as Story Points, Effort Points, or Task Weight): 
  - Extract points from task labels to track effort or complexity
  - View project-level and daily total points
  - Track progress against daily points target
  - Great for tracking effort in both work and personal tasks
- **Daily Targets**:
  - Set and track daily task completion goals
  - Set daily points goals
  - Visual indicators show progress towards targets
  - Motivational quotes when targets are met
- **Search**: Quickly find specific completed tasks

## Getting Started

1. Install the extension
2. Add your Todoist API token (found in Todoist Settings > Integrations > API token)
3. Configure your preferences:
   - Daily task target (default: 5 tasks)
   - Enable/disable story points tracking
   - Set story points keyword (default: "Points:")
   - Set daily story points target (default: 10 points)
4. Use the command:
   - `Done List` to view today's accomplishments

## Task Organization

- Tasks are grouped by project
- Project headers show: "ProjectName (X tasks | Y points)"
- Tasks show priority indicators and story points (if enabled)
- Click any task to open it in Todoist app or browser
- High priority tasks appear first within each project

## Why Done List?

Sometimes we focus too much on what's left to do, rather than appreciating what we've already accomplished. This extension helps you see what you've done today by showing your completed tasks and celebrating when you hit your daily targets.
