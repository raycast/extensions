# obsidian-symlink-manager Agent Rules

Key documents in the `specifications-vault` folder include:
* `03_Requirements` – Functional & non-functional requirements, use cases, activity diagrams, and the software requirement specification.
* `04_Architecture` – Technical architecture, system architecture, architectural decisions, and behavioral modeling.

> **Instruction for AI Agents:** When answering architectural questions or writing code, reference the appropriate spec files inside `obsidian-symlink-manager/specifications-vault/` and ensure full consistency with defined conventions.

---

## Project Goals
This project is a Raycast extension designed to help manage multiple Obsidian vaults without duplicating configuration files. The core idea is to establish a single "source of truth" origin vault, and then intelligently symlink plugins, themes, and CSS snippets from that origin to any other target vaults you use. 

Instead of manually copying over files every time a plugin updates, you can use this extension to inspect the state of your vault symlinks, easily fix broken ones, and even bootstrap brand new vaults by selectively linking components from the origin. Above all else, the extension must prioritize safety—it should always verify paths, gracefully handle missing targets, and never perform destructive operations that could compromise the user's local Obsidian data.

---

## Tech Stack & Standards
* **Framework:** Raycast API (`@raycast/api`, `@raycast/utils`)
* **Runtime:** Node.js (via Raycast runtime)
* **Language:** TypeScript (`strict: true`)
* **File Operations:** Node `fs/promises` (`lstat`, `readlink`, `symlink`, `unlink`) with POSIX/Windows cross-platform path handling (`path`).

---

## Development Workflow & Commands
* `npm install` – Install dependencies
* `npm run dev` – Start Raycast extension development mode
* `npm run build` – Build extension bundle
* `npm run lint` – Run ESLint and Prettier checks

---

## Agent Instructions & Rules
* **Always verify against specifications:** Do not invent file structures or settings keys without consulting `obsidian-symlink-manager/specifications-vault/`.
* **Safe Filesystem Changes:** Always verify `lstat().isSymbolicLink()` before invoking `unlink()`. Never recursively delete files without explicit confirmation prompts (`showHUD` / `confirmAlert`).
* **Keep Raycast UI Responsive:** Perform heavy I/O scans asynchronously using Raycast's `usePromise` or background workers.
