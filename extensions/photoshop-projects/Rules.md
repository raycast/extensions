# Engineering Rules & Standards (Rules)

## Core Principles

### 1. Clean Code Standards
- **Meaningful Names**: Use intention-revealing names (`photoshopRecentFiles`, `loadRenderedThumbnail`) rather than ambiguous abbreviations (`recents`, `thumb`).
- **Small Functions**: Every function must do one thing well. Aim for under 25 lines per function.
- **One Level of Abstraction**: High-level workflow orchestration must not be mixed with low-level stream/buffer regex parsing.
- **No Side Effects**: Functions must not mutate global state unexpectedly.

### 2. Safety & Subprocess Discipline
- **NEVER use `exec` or raw string command line construction**:
  - Always use `execFile` or `spawn` from `node:child_process` with an array of arguments to prevent shell injection.
  - Wrap all external tool executions (`mdfind`, `mdls`, `qlmanage`, `osascript`) in bounded timeouts (2-5 seconds max) with `AbortSignal` or timeout options.
- **Defensive File Handling**:
  - Always check `fs.existsSync(filePath)` before querying or invoking macOS services.
  - Handle corrupt or 0-byte PSD files without throwing uncaught exceptions.

### 3. Visual & Raycast UX Integrity
- **Rendered Artworks over Generic Icons**:
  - Never display standard generic document icons if a rendered visual thumbnail can be produced.
  - When thumbnail generation is in flight, display a clean placeholder and update reactively once rendered.
- **Quick Look Consistency**:
  - In Quick Look (`⌘Y`), point to the rendered PNG artifact so the full artwork expands cleanly in macOS QuickLook.
- **Persistence**:
  - Persist user view preferences (`Grid` vs `List`) in `LocalStorage` across sessions.

### 4. Code Quality & Lint Gates
- 0 ESLint errors.
- 0 TypeScript compilation errors (`npm run build`).
- 0 `ray lint` violations.
