# Contributing to Tella Raycast Extension

Thank you for your interest in contributing! This document provides guidelines for contributing to the Tella Raycast extension.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tella
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Lint and format**
   ```bash
   npm run lint
   npm run fix-lint
   ```

## Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **Formatting**: Prettier is configured - run `npm run fix-lint` before committing
- **Linting**: ESLint with Raycast config - fix all linting errors
- **Imports**: 
  - Import types from `./types`
  - Import functions from `./api`
  - Import shared utilities from `./utils`
  - Import shared components from `./components`

## Architecture

### File Structure

- `src/api.ts` - API client for Tella API
- `src/types.ts` - TypeScript type definitions
- `src/cache.ts` - Caching utilities (video and transcript caching)
- `src/utils.ts` - Shared utility functions and constants
- `src/components.tsx` - Shared React components (e.g., ErrorDetail)
- `src/*.tsx` - Command implementations

### Error Handling

All errors should use the `ErrorDetail` component from `./components`:

```typescript
import { ErrorDetail } from "./components";

// Component-level errors
if (error) {
  return <ErrorDetail error={error} context={{ command: "Command Name" }} />;
}

// Action-level errors
try {
  await someAction();
} catch (error) {
  push(<ErrorDetail error={error} context={{ action: "Action Name" }} />);
}
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed error handling patterns.

### Caching

- Video cache: Uses `LocalStorage` with configurable duration
- Transcript cache: Persistent cache for faster subsequent searches
- Cache functions are in `src/cache.ts`

### Constants

Magic numbers should be extracted to named constants in `src/utils.ts`:

```typescript
export const CACHE_FRESH_THRESHOLD_MS = 5 * 60 * 1000;
export const GRID_INITIAL_LOAD = 24;
export const FETCH_CONCURRENCY = 5;
```

## Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add tests if applicable
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run build
   npm run lint
   ```

4. **Update CHANGELOG.md**
   - Add your changes under the appropriate version
   - Use `{PR_MERGE_DATE}` placeholder for the date

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: description of your change"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Testing

While automated tests are not currently set up, please manually test:

1. All commands work as expected
2. Error handling displays properly
3. Caching behaves correctly
4. No console errors in Raycast developer tools

## Questions?

Feel free to open an issue for questions or clarifications.
