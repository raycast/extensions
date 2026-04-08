# Project Structure

All source code lives under `croc-transfer/`.

```
croc-transfer/
├── package.json            # Extension manifest, commands, preferences, scripts
├── tsconfig.json           # TypeScript configuration
├── raycast-env.d.ts        # Auto-generated from manifest — do NOT edit manually
├── assets/
│   └── extension-icon.png
└── src/
    ├── send-file.tsx        # "Send File" command entry point
    ├── receive-file.tsx     # "Receive File" command entry point
    ├── transfer-history.tsx # "Transfer History" command entry point
    ├── components/
    │   └── InstallGuide.tsx # Shown when croc binary is not found
    ├── hooks/
    │   ├── useCrocCheck.ts       # Checks if croc is installed; returns path + version
    │   ├── useTransfer.ts        # State machine hook for transfer lifecycle
    │   └── useTransferHistory.ts # Loads/manages transfer history from LocalStorage
    └── utils/
        ├── croc.ts     # Binary detection, preference access, CLI arg building
        ├── history.ts  # LocalStorage CRUD for TransferRecord objects
        └── process.ts  # PTY wrapper, spawn helpers, progress parsing, file renaming
```

## Architecture Patterns

- **Command files** (`src/*.tsx`) are Raycast entry points. Each exports a default React component and maps 1:1 to a `commands` entry in `package.json`.
- **Hooks** (`src/hooks/`) encapsulate stateful logic. Follow the `use*` naming convention.
- **Utils** (`src/utils/`) are pure logic modules with no React dependency.
- **Components** (`src/components/`) are reusable React components shared across commands.

## Conventions

- State machines use union string types (e.g., `type SendState = "form" | "zipping" | "starting" | ...`) driven by `useState`.
- Raycast UI primitives (`Detail`, `List`, `Form`, `ActionPanel`) are used directly — no custom abstraction layer.
- Long-lived process handles and file path refs use `useRef`; always kill processes and clean up temp files on unmount.
- Toast notifications track long-running operation status and are updated in-place (not re-created).
- `raycast-env.d.ts` is auto-generated from `package.json` — never edit it manually.
- New commands must be registered in `package.json` `commands` array before they can be used.

## Separation of Concerns

| Layer | Location | Rule |
|---|---|---|
| UI rendering | `src/*.tsx`, `src/components/` | No direct process spawning or FS access |
| State management | `src/hooks/` | No Raycast UI imports except `showToast` |
| Business logic | `src/utils/` | No React imports |
