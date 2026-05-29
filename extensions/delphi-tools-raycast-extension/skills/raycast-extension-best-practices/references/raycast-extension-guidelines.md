# Raycast Extension Guidelines

Sources:

- Raycast Best Practices: https://developers.raycast.com/information/best-practices
- Raycast File Structure: https://developers.raycast.com/information/file-structure
- Project glossary: ../../CONTEXT.md

## Best Practices

### Error Handling

Handle expected failures inside commands. Network calls, file permissions, missing data, and local process failures should not unnecessarily interrupt the user. For recoverable failures, show a Raycast toast with failure styling and a useful message. If cached or stale data is acceptable, show it rather than blocking the workflow.

### Runtime Dependencies

Avoid runtime dependencies where possible. When a command needs a local app, CLI, or permission:

- Show a clear message when the dependency is required for the command.
- Avoid over-strict checks when the whole extension is naturally coupled to that dependency.
- If only one feature needs the dependency, expose that feature conditionally, usually as an Action.

### Loading

Render the first Raycast component quickly. Start with an empty `List`, static `Form`, `Grid`, or `Detail`, then load data asynchronously. Use the top-level component `isLoading` prop to indicate work in progress.

### Forms

Validate form fields before submit. The Raycast pattern is to validate on blur, clear field errors on change, and prevent submit while errors exist. Prefer `useForm` and `FormValidation` from `@raycast/utils` for standard validation behavior.

## File Structure

Raycast extensions contain at least one entry point file and a `package.json` Manifest.

Expected structure:

```text
extension/
├── assets/
│   └── icon.png
├── eslint.config.js
├── package-lock.json
├── package.json
├── src/
│   └── command.tsx
└── tsconfig.json
```

Guidelines:

- Put source files in `src/`.
- Prefer TypeScript. Use `.tsx` when a command renders UI.
- A command `name` in `package.json` maps to an entry file in `src/` with the same name.
- Put packaged icons and images in `assets/`.
- Do not manually edit `node_modules` or `package-lock.json` except through dependency management commands.
- Treat `eslint.config.js` and `tsconfig.json` as support files; change them only when the project-level tooling requirement changes.

## Repo-Specific Language

Read `../../CONTEXT.md` before changing product language. The most important collision:

- **Tool** means a focused delphitools utility.
- **Raycast Tool** means a Raycast callable extension entry point.
