# ESLint 9 Upgrade Guide for Raycast Extensions

This guide documents the complete process for upgrading a Raycast extension from ESLint 8 to ESLint 9.

## Overview

ESLint 9 introduced significant changes, most notably the **flat config format** (`eslint.config.mjs`) replacing the legacy `.eslintrc.*` format. Raycast's `@raycast/eslint-config` package (v2.1.1+) supports ESLint 9 with the flat config format.

## Prerequisites

- Node.js 18.18.0 or higher (ESLint 9 requirement)
- Raycast API v1.103.6 or higher
- `@raycast/eslint-config` v2.1.1 or higher

## Step-by-Step Upgrade Process

### 1. Update Dependencies

Update your `package.json` to use ESLint 9:

```json
{
  "devDependencies": {
    "@raycast/eslint-config": "^2.1.1",
    "eslint": "^9.39.1",
    "typescript": "^5.9.3"
  }
}
```

### 2. Migrate to Flat Config Format

**Delete** the old ESLint configuration file if it exists:

- `.eslintrc.js`
- `.eslintrc.json`
- `.eslintrc.yml`
- Or the `eslintConfig` field in `package.json`

**Create** a new `eslint.config.mjs` file in your project root:

```javascript
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([...raycastConfig]);
```

### 3. Update TypeScript Configuration

Ensure your `tsconfig.json` includes the new ESLint config file:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts", "eslint.config.mjs"],
  "compilerOptions": {
    "types": ["node", "react", "react-dom"],
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

**Key points:**

- Add `"eslint.config.mjs"` to the `include` array
- No special `compilerOptions` are required for ESLint 9

### 4. Install Dependencies

Run the installation command:

```bash
npm install
```

This will install ESLint 9 and the updated Raycast ESLint config.

### 5. Fix Linting Issues

ESLint 9 may be stricter about certain patterns. Common issues include:

#### Unused Catch Parameters

**Before:**

```typescript
try {
  // some code
} catch (e) {
  // error not used
}
```

**After:**

```typescript
try {
  // some code
} catch {
  // no parameter needed if not used
}
```

Run the linter with auto-fix:

```bash
npx ray lint --fix
```

### 6. Verify the Build

Ensure your extension still builds correctly:

```bash
npm run build
```

### 7. Test the Extension

Run your extension in development mode to verify everything works:

```bash
npm run dev
```

## Common Issues and Solutions

### Issue: `@typescript-eslint/no-unused-vars` errors

**Problem:** Catch block parameters that aren't used trigger errors.

**Solution:** Remove the parameter entirely:

```typescript
// ❌ Bad
} catch (e) {
  // ignore
}

// ✅ Good
} catch {
  // ignore
}
```

If you need the error for logging or type checking, keep the parameter:

```typescript
// ✅ Good - parameter is used
} catch (error) {
  logger.error("Failed:", error);
}
```

### Issue: ESLint config not found

**Problem:** ESLint can't find the configuration file.

**Solution:** Ensure `eslint.config.mjs` is in the project root and included in `tsconfig.json`.

### Issue: Flat config format errors

**Problem:** Trying to use old `.eslintrc.*` format with ESLint 9.

**Solution:** ESLint 9 requires the flat config format. Delete old config files and use `eslint.config.mjs`.

## Verification Checklist

After upgrading, verify:

- [ ] `npm install` completes without errors
- [ ] `npx ray lint` passes without errors
- [ ] `npm run build` succeeds
- [ ] `npm run dev` works correctly
- [ ] Extension functionality is unchanged
- [ ] No console errors in Raycast

## Rollback Plan

If you encounter issues, you can rollback:

1. Revert `package.json` changes
2. Delete `eslint.config.mjs`
3. Restore old `.eslintrc.*` file
4. Run `npm install`
5. Downgrade to ESLint 8:

```json
{
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.0",
    "eslint": "^8.57.0"
  }
}
```

## Benefits of ESLint 9

- **Simpler configuration:** Flat config format is more intuitive
- **Better performance:** Improved parsing and linting speed
- **Modern JavaScript support:** Better handling of ES2023+ features
- **Improved type checking:** Better integration with TypeScript

## Additional Resources

- [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Flat Config Documentation](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Raycast Extensions Documentation](https://developers.raycast.com/)
- [@raycast/eslint-config](https://www.npmjs.com/package/@raycast/eslint-config)

## Summary

The ESLint 9 upgrade process for Raycast extensions is straightforward:

1. Update dependencies to ESLint 9
2. Replace `.eslintrc.*` with `eslint.config.mjs`
3. Update `tsconfig.json` to include the new config
4. Install dependencies
5. Fix any linting issues (primarily unused catch parameters)
6. Verify build and functionality

The main breaking change is the configuration format, but Raycast's ESLint config package handles most of the complexity for you.
