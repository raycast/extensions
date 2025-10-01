# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Guides

- ALWAYS ULTRATHINK

- For any given task firstly rate the uncertainty of the task on a scale from 0 to 100%. If the uncertainty is greater than 10%, ask me clarifying questions until the uncertainty is 10% or less. You must absolutely understand user's problem, the required result, definitions of done and be sure for 98% about your next step.
- Any action must be the best next action among all possibilities. Before doing anything come up with several next action and then pick the best one.
- Follow YAGNI principle for any task. The result must be self-contained with complete business value. Do not add any other functionality just in case or for next task. Every code you write must be related to the current task.

- ALWAYS ULTRATHINK

## Development Commands

- **Build**: `ray build -e dist` - Build the extension
- **Development**: `ray dev` - Run in development mode with hot reloading
- **Lint**: `ray lint` - Lint the TypeScript code

## Project Architecture

This is a Raycast extension for macOS application switching. The project follows Raycast's extension structure:

### Key Components
- **Main Command**: `src/switch-apps.tsx` - The primary command entry point that displays a List component
- **Package Configuration**: `package.json` - Defines the extension metadata, including the "switch-apps" command with view mode
- **TypeScript**: Uses React JSX with TypeScript, configured for ES2020 target

### Extension Structure
- Single command extension with one view mode command: "Switch Apps"
- Uses `@raycast/api` for core functionality and `@raycast/utils` for utilities
- Currently implements a basic empty List component as a starting foundation

### Development Context
The extension is designed to implement progressive functionality according to PLAN.md, starting from an empty installable plugin and building up to a full app switcher with hotkeys and search capabilities. The current state is Task 1 completion - an empty but functional Raycast extension.

### Technical Notes
- The extension uses React JSX syntax with TypeScript
- Auto-generated type definitions are in `raycast-env.d.ts`
- Build output goes to `dist/` directory