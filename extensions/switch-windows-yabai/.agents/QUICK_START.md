# Quick Start Guide - Using the Starter Prompt

This guide helps you effectively use the `z__starter_prompt.yaml` for AI-assisted Raycast extension development.

## 🚀 Quick Start

### 1. First Interaction in Any Session
Always start by having the AI read `AGENTS.md`:
```
Read .agents/AGENTS.md and familiarize yourself with the project standards.
```

### 2. Use the Starter Prompt Template
Copy the relevant sections from `z__starter_prompt.yaml` and fill in the details.

## 📋 Common Scenarios

### Scenario 1: Adding a New Window Action

```yaml
context: |
  Users want to minimize windows without closing them. The window management system
  already supports focus and close actions via yabai CLI. We need to add minimize action.

request: |
  Add minimize window action that can be triggered from the action panel.
  
  Acceptance Criteria:
  - Add "Minimize Window" action to ActionPanel
  - Use yabai command to minimize window
  - Show toast notification on success/failure
  - Add keyboard shortcut (⌘M)
  - Handle errors gracefully

scope: |
  src/handlers.ts
  src/switch-windows-yabai.tsx

test_requirements: |
  - Unit tests for handler function
  - Mock yabai execFile calls
  - Test error scenarios (window not found)

performance_requirements: |
  - Action should execute in < 200ms
  - No UI blocking during execution
```

### Scenario 2: Fixing a Bug in Window Filtering

```yaml
context: |
  Users report that display filtering with #N syntax doesn't work correctly
  when the display number appears in window titles. For example, searching
  "#2 Chrome" filters by display 2 correctly, but "Chrome #2" treats "#2"
  as part of the search text instead of a display filter.

request: |
  Fix display filter parsing to only recognize #N at the beginning of search input.
  
  Expected Behavior:
  - "#2 Chrome" → Filter by display 2, search for "Chrome"
  - "Chrome #2" → Search for "Chrome #2" (no display filter)
  - "#3" → Filter by display 3, show all windows

scope: |
  src/utils/displayFilter.ts
  src/switch-windows-yabai.tsx

test_requirements: |
  - Add unit tests for parseDisplayFilter function
  - Test edge cases (invalid display numbers, multiple #N)
  - Test integration with search flow
```

### Scenario 3: Adding Display Management Feature

```yaml
context: |
  Users with multiple displays want to quickly move windows between displays
  without using keyboard shortcuts. Need interactive display selection.

request: |
  Add submenu action to select target display for moving window.
  
  Acceptance Criteria:
  - Display submenu shows all available displays
  - Each display shows label and dimensions
  - Highlight currently focused display
  - Move window to selected display
  - Update window list after move

scope: |
  src/display-actions-yabai.tsx
  src/handlers.ts

test_requirements: |
  - Test display query and parsing
  - Mock yabai display commands
  - Test window move operation
  - Test UI updates after move

raycast_api_changes: |
  - Use Action.Submenu for display selection
  - Query displays with useExec hook
  - Handle loading and error states
```

### Scenario 4: Optimizing Search Performance

```yaml
context: |
  With large number of windows (50+), search feels sluggish. Users type
  and see lag before results update. Current debounce is 30ms but may
  need optimization.

request: |
  Optimize search performance to handle 100+ windows smoothly.
  
  Expected Behavior:
  - Search results update quickly (< 50ms perceived delay)
  - No dropped keystrokes
  - Smooth UI updates

scope: |
  src/switch-windows-yabai.tsx
  src/utils/optimizedSearch.ts

test_requirements: |
  - Performance benchmarks for search
  - Test with 100+ mock windows
  - Measure debounce effectiveness

performance_requirements: |
  - Search computation < 20ms for 100 windows
  - Debounce delay: 20-30ms
  - Minimize re-renders with useMemo
  - Use React.memo for list items
```

### Scenario 5: Adding New Keyboard Shortcut

```yaml
context: |
  Users want quick access to close empty spaces without opening action panel.
  Need to add global keyboard shortcut.

request: |
  Add ⌘⇧Q keyboard shortcut for "Close Empty Spaces" action.
  
  Acceptance Criteria:
  - Works from main window list
  - Shows confirmation toast
  - Updates space list after cleanup
  - Handles errors gracefully

scope: |
  src/switch-windows-yabai.tsx
  src/handlers.ts

test_requirements: |
  - Test shortcut registration
  - Test action execution
  - Test error handling
```

## 🎯 Field Guide

### When to Fill Each Field

| Field | When to Use | Example |
|-------|-------------|---------|
| **context** | Always | Business requirements, background |
| **request** | Always (required) | What to build/fix + acceptance criteria |
| **scope** | When working in specific area | `src/handlers.ts` |
| **target_files** | When modifying specific files | `src/switch-windows-yabai.tsx` |
| **test_requirements** | When non-standard testing needed | "Must test yabai error scenarios" |
| **raycast_api_changes** | When changing Raycast integration | New components, hooks |
| **performance_requirements** | When performance critical | "Must handle 100+ windows" |
| **yabai_integration** | When adding yabai commands | New window management commands |

### Minimal Example

```yaml
request: |
  Add keyboard shortcut ⌘⇧F to focus on search input
```

The AI will infer most details from this simple request.

### Comprehensive Example

```yaml
context: |
  Window aggregation is a critical feature. Users collect all windows of the
  same app into a dedicated space for focus. Must handle edge cases like
  windows in fullscreen, sticky windows, and empty spaces.

request: |
  Improve window aggregation to handle edge cases robustly.
  
  Acceptance Criteria:
  - Skip fullscreen windows (show warning)
  - Handle sticky windows appropriately
  - Reuse empty spaces before creating new
  - Show progress toast for multi-window operations
  - Update window list after aggregation

scope: |
  src/handlers.ts (handleAggregateToSpace)
  src/switch-windows-yabai.tsx

test_requirements: |
  - Mock yabai window queries
  - Test empty space detection
  - Test space creation fallback
  - Test fullscreen window detection
  - Test progress notifications

yabai_integration: |
  Commands used:
  - yabai -m query --windows --window <id>
  - yabai -m query --windows
  - yabai -m query --spaces
  - yabai -m space --create
  - yabai -m window <id> --space <space_index>
  
  Edge cases:
  - is-native-fullscreen: true (skip)
  - sticky windows
  - insufficient permissions

performance_requirements: |
  - Query operations < 100ms
  - Batch window moves if possible
  - Non-blocking UI during operation

raycast_api_changes: |
  - Use Toast.Style.Animated for progress
  - Update toast message during operation
  - Final toast shows success/failure
```

## 💡 Tips for Best Results

1. **Be Specific**: Clear acceptance criteria lead to better implementations
2. **Provide Context**: Help the AI understand business requirements
3. **Define Scope**: Narrow scope leads to focused solutions
4. **Think About Tests**: Specify test scenarios upfront
5. **Consider Performance**: Call out performance requirements explicitly
6. **Plan Yabai Integration**: Think through commands and error cases
7. **Use Examples**: Reference existing code patterns when helpful

## 🔍 What Happens Next

After you provide the prompt, the AI will:

1. ✅ Read `AGENTS.md` (if not already read this session)
2. 🔍 Analyze your request and assess confidence
3. ❓ Ask clarifying questions if confidence < 80%
4. 📋 Create implementation plan
5. 💻 Write code following project standards
6. 🧪 Write comprehensive tests
7. ✔️ Validate against requirements
8. 📝 Document changes
9. 🎯 Request approval for breaking changes

## 📚 Related Documentation

- **.agents/AGENTS.md** - Core decision framework (read first!)
- **.agents/knowledge/typescript_standards.md** - TypeScript coding standards
- **.agents/knowledge/react_raycast_patterns.md** - React/Raycast patterns
- **.agents/knowledge/yabai_integration.md** - Yabai CLI integration
- **.agents/knowledge/window_management.md** - Window management patterns
- **.agents/knowledge/testing_strategy.md** - Testing approaches
- **.agents/knowledge/performance_patterns.md** - Performance optimization

## 🤔 When in Doubt

If you're unsure what to include:

1. Start with just `request` (the only required field)
2. Let the AI ask clarifying questions
3. The AI will guide you through gathering necessary details

The system is designed to handle uncertainty and will ask questions when needed!
