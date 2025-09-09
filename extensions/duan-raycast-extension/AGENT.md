# Duan Raycast Extension Agent Guidelines

## Commands
- Build: `npm run build` or `ray build`
- Development: `npm run dev` or `ray develop`
- Lint: `npm run lint` or `ray lint`
- Fix linting issues: `npm run fix-lint` or `ray lint --fix`
- Publish: `npm run publish`

## Code Style
- Use TypeScript with strict typing
- Follow Prettier config: 120 char line width, double quotes
- Use React functional components with arrow function syntax
- Import order: external libraries, then local imports
- Type imports: use `import type` for type-only imports
- Prefer async/await for asynchronous operations
- Use descriptive function and variable names
- Components should use named exports
- Services are organized by domain/feature
- Use Raycast components (@raycast/api) for UI elements
- Error handling: use try/catch blocks for API calls

This is a Raycast extension built with TypeScript and React.