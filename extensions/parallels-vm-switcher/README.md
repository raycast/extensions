# Parallels VM Switcher

Reliably open or switch to the exact registered Parallels Desktop virtual machine from Raycast, including a VM on another macOS Space. VM identity is UUID-based, and success requires the target Console window to be genuinely onscreen rather than merely marked focused by Accessibility.

Parallels exposes Console windows by title rather than VM UUID. If two registered VMs share the same normalized name, switching therefore fails explicitly and asks you to rename one instead of guessing which window is the target.

## Requirements

- macOS
- Raycast
- Raycast enabled in **System Settings → Privacy & Security → Accessibility** so the extension can focus and verify the exact VM window
- Parallels Desktop with a Pro, Business, or Enterprise license

## Commands

- **Open or Switch Virtual Machine** — browse or search all registered VMs. Press Return to start, resume, or focus the selected VM.
- **Switch Virtual Machine by Name** — enter a full name, a unique part of a name, or a UUID directly. Assign an alias such as `vm`, or configure it as a fallback command, for a short root-search workflow.

Raycast indexes extension commands, not VM rows created at runtime. Dynamic VM names therefore appear inside **Open or Switch Virtual Machine**, while the argument command provides a native root-search workflow without generated apps or a background agent.

## Development

```sh
npm install
npm run dev
```

Before contributing:

```sh
npm test
npm run lint
npm run build
```

See [CONTEXT.md](CONTEXT.md) for the domain model and runtime invariants. This independent extension contains MIT-licensed work derived from the original Parallels Virtual Machines extension; see [NOTICE.md](NOTICE.md) for attribution.
