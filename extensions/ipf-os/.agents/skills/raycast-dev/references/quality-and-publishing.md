# Raycast Extension Quality, Verification & Publishing

Guidelines and automated verification workflows for building production-grade Raycast extensions ready for the Raycast Store.

---

## 1. CLI Development & Verification Tooling

Raycast CLI (`ray`) manages development mode, linting, building, and publishing.

### Primary Commands:
```bash
# Start live development compiler with hot-reload in Raycast
npm run dev # (ray develop)

# Type-check and build production artifacts into dist/
npm run build # (ray build)

# Run Raycast's strict ESLint rules
npm run lint # (ray lint)

# Automatically fix autofixable ESLint and formatting issues
npm run fix-lint # (ray lint --fix)

# Validate and publish to Raycast Store
npm run publish # (npx @raycast/api@latest publish)
```

---

## 2. Invariant Quality Checklist

Every Raycast extension must adhere to these non-negotiable quality rules:

### A. Performance & Startup Time (< 100ms)
- **Zero Heavy Top-Level Imports**: Do not import large SDKs or heavy libraries at the module root if only used inside specific callbacks or secondary views. Import dynamically or keep packages minimal.
- **Immediate Initial Render**: Views must never freeze or block rendering. Always mount with `isLoading={true}` or populate from `useCachedState` / `useCachedPromise` while background fetches execute.
- **Pagination & Virtualization**: When rendering large lists (>100 items), implement pagination or truncate search responses.

### B. Keyboard Navigation & Action Ordering
- **Primary Action First**: The default action bound to `Return` must always be the most common, intuitive action (e.g. "View Details" or "Open in Browser").
- **Consistent Shortcuts**:
  - `Cmd + K`: Open Action Panel (automatic).
  - `Cmd + Enter`: Secondary action (e.g., "Create", "Submit", "Edit").
  - `Cmd + C`: Copy primary identifier or link (`Action.CopyToClipboard`).
  - `Cmd + Shift + C`: Copy secondary property.
  - `Cmd + D` or `Ctrl + X`: Destructive action with `confirmAlert`.
  - `Cmd + R`: Refresh / revalidate.

### C. Error Handling & User Feedback
- **Never Fail Silently**: If an API call fails, display a `Toast.Style.Failure` with the error description.
- **Actionable Errors**: Whenever possible, provide a `primaryAction` on failure toasts (e.g., "Open Settings", "Copy Error Details", "Retry").
- **Clean Form Validation**: Use `useForm` from `@raycast/utils` with inline field errors rather than alert popups.

### D. Icon & Visual Assets
- **Extension Icon**: `assets/extension-icon.png` (or root `extension-icon.png`) must be a 512x512 PNG, visually balanced, without hard-cut corners (macOS rounded squircle is applied automatically).
- **Command Icons**: Each command can define custom icons in `package.json` or use `Icon.*` constants.
- **Semantic Color Usage**: Use `Color.Green`, `Color.Orange`, `Color.Red`, `Color.Blue`, `Color.Purple`, and `Color.SecondaryText` to indicate state semantically rather than arbitrary hardcoded hex codes.

---

## 3. Store Submission Checklist

Before submitting to the Raycast Store:

1. [ ] **Manifest Completeness**:
   - `name`: kebab-case matching repo/folder name.
   - `title`: Clean Title Case (no "Raycast", "Extension", or emoji in title).
   - `description`: 1-2 informative sentences explaining the extension's core utility.
   - `categories`: 1-2 standard categories.
   - `license`: `MIT` (or appropriate open-source license).
2. [ ] **Lint and Build Passes**:
   ```bash
   npm run lint && npm run build
   ```
3. [ ] **No Hardcoded Credentials**: API tokens and personal keys must use `type: "password"` in preferences or OAuth PKCE.
4. [ ] **Empty Views Implemented**: Every `List` and `Grid` has an informative `<List.EmptyView>` with icon, title, description, and action.
5. [ ] **Documentation**: `README.md` includes features overview, setup instructions (e.g. how to get API keys), and screenshots/GIFs.
