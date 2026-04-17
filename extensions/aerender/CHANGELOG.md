# After Effects Render Changelog

## [Initial Release] - {PR_MERGE_DATE}

Render After Effects projects using aerender while you keep working on your next project.

### Features

**Rendering**
- Background rendering using aerender command-line engine
- Auto-detect all installed After Effects versions
- Live progress tracking with frame counter and elapsed time
- Stop active renders with Cmd+. keyboard shortcut
- Silent rendering (sound disabled by default)
- Smart completion detection

**History & Management**
- Render history with completion status
- Track render duration and frame counts
- Stop renders from history view
- Auto-refresh running renders every 2 seconds

**User Experience**
- Native Raycast UI components
- Project file picker with validation (.aep, .aepx)
- Real-time progress sidebar with metadata
- Quick actions: open output folder, show in Finder, copy paths
- Error handling and validation

### Technical
- Process cleanup to prevent zombie processes
- PID tracking for running renders
- LocalStorage for history persistence
- Proper error handling for edge cases