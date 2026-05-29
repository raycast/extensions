---
name: raycast-extension-best-practices
description: Use when implementing, reviewing, or refactoring Raycast extensions in this repo, especially changes to commands, actions, forms, package.json manifest entries, src/ entry point files, assets, runtime dependency handling, loading states, or user-facing Raycast UX.
---

# Raycast Extension Best Practices

Use this skill to keep Raycast extension work aligned with Raycast platform expectations and this repo's product language.

Before making terminology-sensitive changes, read [../../CONTEXT.md](../../CONTEXT.md). It defines local terms such as **delphitools**, **Raycast Extension**, **Command**, **Action**, **Manifest**, and **Raycast Tool**.

## Workflow

1. Inspect `package.json`, `src/`, and the relevant command file before editing.
2. Check whether the change affects Raycast concepts named in `CONTEXT.md`; use those terms consistently.
3. Apply the checklist below while designing or reviewing the change.
4. Load [references/raycast-extension-guidelines.md](references/raycast-extension-guidelines.md) when you need the detailed Raycast guidance summary or source URLs.
5. Validate with the repo's normal checks, usually `npm run lint`.

## Checklist

- Keep each command entry point in `src/`; the command `name` in `package.json` maps to `src/<name>.ts`, `.tsx`, `.js`, or `.jsx`.
- Use TypeScript by default. Use `.tsx` for commands with Raycast UI.
- Keep bundled icons and images in `assets/`; reference them from the manifest or runtime UI where appropriate.
- Treat `package.json` as the Raycast Manifest: keep extension metadata, commands, tools, dependencies, and icons coherent.
- Handle expected errors inside commands. Prefer `showToast` with `Toast.Style.Failure` for recoverable failures rather than letting Raycast show generic error screens.
- For runtime dependencies such as local CLIs or apps, detect missing dependencies and show useful install or recovery guidance.
- If only one Action depends on a local dependency, hide or disable that Action instead of blocking the whole Command.
- Render a top-level Raycast component quickly. Use `isLoading` on `List`, `Grid`, `Form`, or `Detail` while loading slower data.
- Validate Forms before submit. Prefer `useForm` from `@raycast/utils` and ensure invalid forms do not call submit handlers.
- Put contextual operations in Actions inside an Action Panel; keep Commands as root-search entry points.
