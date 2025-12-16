# Stashit

A simple priority queue extension for Raycast that helps you manage tasks with priorities.

## Features

- **Add to Queue**: Add items with priority tags (e.g., `Message my manager #10`)
- **Queue Pop**: Pop the highest priority item from the queue
- **View Queue**: See all items sorted by priority

## Usage

### Adding Items

Use the "Add to Queue" command and type your task with a priority:

```
Message my manager about the project #10
Buy groceries #3
Call dentist #5
```

The `#<number>` pattern sets the priority. Higher numbers = higher priority.
If no priority is specified, it defaults to 0.

### Popping Items

Use the "Queue Pop" command to get the highest priority item. The item is:

1. Removed from the queue
2. Copied to your clipboard
3. Shown in a HUD notification

### Viewing the Queue

Use the "View Queue" command to see all items sorted by priority. From here you can:

- Pop individual items
- Copy items to clipboard
- Remove items from the queue

## Installation

1. Clone this repository
2. Navigate to the directory
3. Run `npm install`
4. Run `npm run dev` to start development mode (this will open Raycast with the extension loaded)

## Development

```bash
npm install    # Install dependencies
npm run dev    # Start development mode
npm run build  # Build the extension
npm run lint   # Run linter
```
