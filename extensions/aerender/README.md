# After Effects Render for Raycast

Render After Effects projects using aerender while you keep working on your next project.

## Why Use This Extension?

**Stop waiting for renders.** Queue your composition in After Effects, fire off the render from Raycast, and immediately get back to work. Your project renders in the background using aerender (After Effects' command-line engine) while you focus on your next creative work.

### Key Benefits
- **True background rendering** - aerender runs independently of the After Effects UI
- **Stay productive** - Keep working while previous projects render
- **No babysitting** - Set it and forget it with live progress tracking
- **Native integration** - Launch renders directly from Raycast's command palette

## Features

### Rendering
- Auto-detect all installed After Effects versions (including Beta)
- Background rendering using aerender command-line engine
- Live progress tracking with frame counter and elapsed time
- Stop active renders anytime with Cmd+.
- Silent rendering by default

### History & Management
- View all renders with status indicators (completed, running, failed)
- Track render duration and frame counts
- Stop running renders from history view
- Quick actions: open output folder, show in Finder, copy paths

### User Experience
- Native Raycast UI components
- File picker with validation (.aep, .aepx files)
- Real-time progress sidebar with metadata
- Clear error messages and validation

## Quick Start

### Prerequisites
- Adobe After Effects (any version)
- Raycast

### How to Render
1. Open your After Effects project
2. Add compositions to the render queue
3. Set output paths for each item
4. **Save the project file**
5. Open Raycast → `Start Render`
6. Select AE version and project file
7. Click "Start Rendering"

Your render now runs in the background while you continue working.

## Commands

### Start Render
Launch new renders:
- Choose from detected AE versions
- Select project file with native file picker
- See pre-flight checklist before rendering

### View Render History
Monitor your renders:
- See completed, running, and failed renders
- View render duration and frame counts
- Stop running renders
- Access output folders quickly

## Development

```bash
npm install      # Install dependencies
npm run dev      # Run in development
npm run build    # Build for production
npm run lint     # Check code quality
```

## Tech Stack

- Raycast API - Native UI and system integration
- TypeScript - Type-safe development
- Node.js - Process management for aerender
- LocalStorage - Render history persistence

## License

MIT