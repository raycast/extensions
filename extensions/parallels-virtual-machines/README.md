# Parallels Virtual Machines

Search registered Parallels Desktop virtual machines from Raycast, then start, resume, or switch to one with the same action. VM identity is UUID-based, so renaming a VM does not break it.

## Requirements

- macOS
- Raycast
- Parallels Desktop Pro

## Commands

- **Open Virtual Machine** — browse or search all registered VMs. Press Return to open or switch to the selected VM.
- **Open Virtual Machine by Name** — enter a full name, a unique part of a name, or a UUID directly. Assign an alias such as `vm`, or configure it as a fallback command, for a short root-search workflow.
- **Shut Down** — quit Parallels Desktop and stop its background services.

Raycast indexes extension commands, not VM rows created at runtime. Dynamic VM names therefore appear inside **Open Virtual Machine**, while the argument command provides the closest native root-search workflow without generated apps or a background agent.

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

This package is structured as a contribution to the existing [Parallels Virtual Machines extension](https://www.raycast.com/danpalmer/parallels-virtual-machines) in the public Raycast extensions repository.
