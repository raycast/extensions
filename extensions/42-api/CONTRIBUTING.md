# Contributing to 42 API Extension

Thank you for your interest in contributing to this Raycast extension! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Raycast](https://raycast.com/) installed
- A 42 OAuth application (see [README.md](README.md#setup) for setup instructions)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/42-api-raycast.git
   cd 42-api-raycast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. The extension will appear in Raycast. Configure your 42 OAuth credentials in the extension preferences.

## Project Structure

```
src/
├── lib/                    # Core library modules
│   ├── auth.ts            # OAuth authentication handling
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── utils.ts           # Utility functions (time formatting, etc.)
│   └── api.ts             # 42 API client abstraction
├── hooks/                  # React hooks
│   ├── useAuth.ts         # Authentication state management
│   ├── useUser.ts         # User data fetching
│   ├── useLocationStats.ts # Location statistics fetching
│   └── index.ts           # Barrel exports
├── find-user.tsx          # Find User command
├── check-logtime.tsx      # Check Logtime command
└── today-logtime.tsx      # Menu bar logtime display
```

## Adding New Features

### Adding a New API Endpoint

1. Add the response type to `src/lib/types.ts`
2. Add the API method to `src/lib/api.ts`
3. (Optional) Create a custom hook in `src/hooks/`

Example:
```typescript
// In src/lib/types.ts
export interface Project {
  id: number;
  name: string;
  // ...
}

// In src/lib/api.ts
export async function getProjects(userId: number): Promise<ApiResult<Project[]>> {
  return fetchApi<Project[]>(`/users/${userId}/projects`);
}
```

### Adding a New Command

1. Create a new `.tsx` file in `src/`
2. Register the command in `package.json` under `commands`
3. Use existing hooks from `src/hooks/` for common functionality

## Code Style

- Run `npm run lint` before committing
- Run `npm run fix-lint` to auto-fix issues
- Use TypeScript strict mode
- Follow existing patterns for consistency

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Run build: `npm run build`
6. Commit with a descriptive message
7. Push and open a Pull Request

## Questions?

Feel free to open an issue for any questions or suggestions!
