This is an extension for Raycast that adds integrations with Sourcegraph.

- For more information about building a Raycast extension, refer to https://developers.raycast.com and related pages.
- The various APIs that Sourcegraph has available are integrated in `src/sourcegraph`.

In this extension, most commands have two variants:

- an "instance" command, for the configured Sourcegraph instance
- a "dotcom" command, for Sourcegraph's public code search instance

All features should generally support each variant with only minimal differences.

## Code style

- When making changes, always use `npm run fmt` to run formatting and linting checks and automatically fix them. `npm run build` can be used to perform final checks.
- Do not add newlines between variable assignments.
- Do not use `any`.
