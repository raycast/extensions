This an extension for Raycast that adds integrations with Sourcegraph.

- For more information about building a Raycast extension, refer to https://developers.raycast.com and related pages.
- The various APIs that Sourcegraph has available are integrated in `src/sourcegraph`.

## Code structure

This Raycast extension exposes a set of commands, and a set of AI tools.
In this extension, most commands have two variants:

- an "instance" command, for the configured Sourcegraph instance
- a "dotcom" command, for Sourcegraph's public code search instance

Similarly, in AI commands (`src/tools`), each command has a direct variant for the instance and for dotcom (`public_*`).

All features should generally support each variant with only minimal differences.

Entrypoints for all of the above are defined in `package.json`:

- `"commands"`: all available commands, with the entrypoint in a `.tsx` file of the same name in `src/`. For example, the `searchInstance` command corresponds to `src/searchInstance.tsx`.
- `"tools"`: all available tools and their descriptions, with the entrypoint in a `.tx` file of the same name in `src/tools`. For example, the `keyword_code_search` tool corresponds to `src/tools/keyword_code_search.ts`.

Additional AI tool instructions are set in `ai.yaml`.

## Code style

- When making changes, always use `npm run fmt` to run formatting and linting checks and automatically fix them. `npm run build` can be used to perform final checks.
- Do not add newlines between variable assignments.
- Do not use `any`.
