# Guidelines for AI Assistants

This repository contains a Raycast extension built with TypeScript and React.

- **Run `npm run lint` before committing any code changes** in `src/` or `lib/`.
- Documentation-only updates (like this file or the README) do not require linting.
- Keep code strict and typed. Use async/await instead of callbacks.
- Format with Prettier. The project uses the Raycast ESLint config.
- There are no automated tests yet; linting is the main check.
- Core commands include adding projects, setting the active project, clearing caches,
  running migrations or tests, listing routes or artisan commands, running custom
  artisan commands, discovering projects, managing the project list, tailing logs,
  editing environment files, installing or updating Composer packages, serving the
  app, and running queue workers.

Happy coding!
