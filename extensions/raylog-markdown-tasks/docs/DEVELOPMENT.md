# Development Notes

## Window Flow

This diagram is the implementation-facing source of truth for Raylog - Markdown
Tasks' current window and navigation flow. The automated test suite validates
the Mermaid block below so the documented flow stays aligned with the extension
behavior.

```mermaid
flowchart TD
    A["Raylog - Markdown Tasks"] --> B["List Tasks command"]
    A --> C["Add Task command"]
    A --> M["Refresh Menu Bar command"]

    B --> Z["Storage note configured and valid?"]
    C --> Z
    Z -->|"No"| Z1["Setup / reset empty state"]
    Z1 -->|"Open Extension Preferences"| Z
    Z1 -->|"Generate New Task Database"| Z
    Z1 -->|"Reset Storage Note"| Z

    subgraph LIST["List Tasks"]
        Z -->|"Yes, launch last used list layout"| B1["Task summary with detail pane"]
        Z -->|"Yes, launch last used list layout"| B2["Task list without detail pane"]
        B1 -->|"Enter"| E["View Task window"]
        B1 -->|"Cmd+F"| B2
        B1 -->|"Cmd+L"| N["Edit Task form (new log focused)"]
        B1 -->|"Cmd+N"| F["Add Task form"]
        B1 -->|"Cmd+E"| G["Edit Task form"]
        B1 -->|"Cmd+Shift+C"| I["Complete selected task"]
        B1 -->|"Cmd+S"| J["Start selected task"]
        B1 -->|"Cmd+R"| K["Reopen selected task"]
        B1 -->|"Cmd+Shift+A"| L["Archive selected task"]
        B1 -->|"Search or Filter"| B1

        I --> B1
        J --> B1
        K --> B1
        L --> B1

        B2 -->|"Enter"| E
        B2 -->|"Cmd+F"| B1
        B2 -->|"Cmd+L"| N
        B2 -->|"Cmd+N"| F
        B2 -->|"Cmd+E"| G
        B2 -->|"Cmd+Shift+C"| I
        B2 -->|"Cmd+S"| J
        B2 -->|"Cmd+R"| K
        B2 -->|"Cmd+Shift+A"| L
        B2 -->|"Search or Filter"| B2

        F -->|"Save"| B1
        G -->|"Save"| B1
    end

    subgraph ADD["Add Task"]
        Z -->|"Yes, launch Add Task"| C1["Standalone Add Task form"]
        C1 -->|"Save"| C2["Pop to root"]
    end

    subgraph VIEW["View Task"]
        E --> E1["Full-window task detail"]
        E1 -->|"Default action: Log Work"| N
        E1 -->|"Cmd+E"| O["Edit Task form"]
        E1 -->|"Cmd+Shift+C"| P["Complete task"]
        E1 -->|"Start Task"| Q["Start task"]
        E1 -->|"Reopen Task"| R["Reopen task"]
        E1 -->|"Archive Task"| S["Archive task"]
        E1 -->|"Delete Task"| U["Delete task"]
        E1 -->|"Reload"| E1

        N -->|"Save"| E1
        N -->|"Status behavior: auto-start or keep or prompt"| E1

        O -->|"Save"| E1
        O -->|"Cmd+D on focused log"| T["Delete Work Log confirm"]
        T -->|"Confirm"| O
        T -->|"Cancel"| O

        P --> E1
        Q --> E1
        R --> E1
        S --> E1
        U --> E1
    end

    subgraph MENU["Refresh Menu Bar"]
        M --> M1["Current task in menu bar"]
        M -->|"No storage note"| M3["Set Up Raylog - Markdown Tasks menu bar state"]
        M1 -->|"Click current task"| M2["Menu bar task submenu"]
        M1 -->|"Click task in Next 5 Tasks"| M2
        M2 -->|"Open Task"| E1
        M2 -->|"Start Task"| Q
        M2 -->|"Complete Task"| P
        M2 -->|"Archive Task"| S
        M1 -->|"Open Task List"| B1
        M1 -->|"Open Task List"| B2

        M3 -->|"Open Extension Preferences"| Z
    end
```

## Architecture

Keep new code aligned with the current split between pure logic and Raycast
integration:

- `src/components` should stay focused on rendering, Raycast component wiring,
  and user-triggered command setup.
- `src/lib` should hold shared task logic, storage and persistence behavior,
  sorting and filtering, validation, and other helpers that can be exercised in
  tests without rendering UI.
- Prefer pure modules in `src/lib` when behavior can be expressed without
  `@raycast/api`; this keeps task rules and storage behavior easy to test.
- Treat flow/spec modules as the source of behavior decisions and shortcuts.
  For example, `src/lib/task-flow.ts` builds task action specs, while
  `src/components/task-action-specs.tsx` adapts those specs into Raycast
  `Action` components.
- When adding features, prefer extending existing pure helpers first and keeping
  Raycast-only adapters thin. Match the current codebase rather than
  introducing a new framework or layer.
