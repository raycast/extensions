# Tembo

Create and manage coding tasks directly from Raycast. Quickly delegate development work to Tembo agents, track progress across repositories, and monitor task status from your menubar.

## Features

### Commands
* **Create Task** - Create a new task in Tembo
* **View Tasks** - View and filter all tasks in your organization with search functionality
* **Tembo in Menubar** - Show your tasks in the menubar for quick access

### Tools
* **Create Tembo Task** - Creates a task in Tembo with the given prompt and optional repository information.
* **View Tembo Tasks** - Retrieves and displays tasks from Tembo, with optional filtering by repository, view type (all, backlog, waiting), and other criteria.

## Setup

To use this extension, you'll need to:

1. Sign up for a Tembo account at [app.tembo.io](https://app.tembo.io)
2. Generate an API key from your Tembo dashboard under Settings → API Keys
3. Enter your API key in the extension preferences

## Screenshots

### Creating a task

<img width="824" height="539" alt="Creating a task in Tembo" src="https://github.com/user-attachments/assets/a8f0f2d0-6d01-416a-b3e0-4c5ebe2f1a1a" />

### Viewing all tasks

<img width="1570" height="1010" alt="Viewing all tasks in Tembo" src="https://github.com/user-attachments/assets/8cccaee4-f593-4aed-a7ea-8c6446faaa20" />

### Menubar item

<img width="756" height="526" alt="Tembo menubar integration" src="https://github.com/user-attachments/assets/90857af9-4887-4c5f-b953-dddff3a0811e" />

### Ask Tembo

#### Viewing tasks

<img width="1570" height="1010" alt="Ask Tembo - viewing tasks" src="https://github.com/user-attachments/assets/33f6bb5a-2f01-4774-b412-14a2b28c365e" />

#### Creating tasks

<img width="1570" height="1010" alt="Ask Tembo - creating tasks" src="https://github.com/user-attachments/assets/4e255ca8-f42a-4094-a9df-fe6cd1fe3d04" />

## Development

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Link the extension to Raycast for development:
   ```bash
   npx @raycast/api@latest link
   ```

### Available Scripts

- **Development mode**: `npm run dev`
  - Start the extension in development mode with hot reloading
  
- **Build**: `npm run build`
  - Build the extension for distribution
  
- **Lint**: `npm run lint`
  - Check code for linting issues
  
- **Fix lint**: `npm run fix-lint`
  - Automatically fix linting issues
  
- **Publish**: `npm run publish`
  - Publish to the Raycast Store

### Configuration

Configure your Tembo API key in Raycast preferences during development. You can find your API key in your Tembo dashboard under Settings → API Keys.