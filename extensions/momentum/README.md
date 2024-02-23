# Momentum

## Commands:

- Create Vite Project, creates a Vite project with the supplied `projectName` & `template`, for templates, see [vite supported templates](https://github.com/vitejs/vite/tree/main/packages/create-vite)
- Create React Project, creates a Vite React project, with some preferences like automatically installing eslint/typescript and a few things.
- Create Vue Project, creates a Vite vue project, preferences include typescript & eslint
- Create Empty Project, basically creates an empty package in Node.js

## Future features

- Support `Go` & `Go mod`
- Support `Python`, `pip3` & `poetry`
- Add express.js MVC template
- Add GraphQL MVC template
- Add Orval.js template bundler a swagger schema url provided
- Add Django with ability to opt-in DRF/GraphQL installation
- Auto-detect IDE-related directories
- User requested features

## Requesting features

- Feel free to request features or PR them
- PRs are preferred to be opened in `@raycast/extensions` to preserve your credit, for such reason: **any PR to project's repo won't be accepted**

## Run locally

- `npm install`
- `npm run dev`

## Lint

- `npm lint`
- `npm fix-lint # fix linting errors`

## Publishing

- `npm publish`

---

## Contribution guides

- Feel free to add one of the supported features or write tests, since I had no time for both even though both were on my timeline
- Command files should be prefixed with `project-`
- Use only `.ts` unless your command has a UI
- Don't alter .eslintrc, Create a separate PR in [@leondaz/eslint-config](https://github.com/LeOndaz/eslint-config)

### Adding commands

1. Package manager is one of `[npm, pnpm, yarn, bun]`

   - Add the command to `package.json`
   - Add a file representing the command `project-my-command.ts`
   - Import `src/utils/ProjectCommand` in file
   - Write the _installation_ logic only, if you want to show an error, use `throw` with the message you want and it will show up in raycast

2. Package manager is one of `[go mod, poetry, pip3]`

   - Most likely, you'll run into issues because I haven't tested them with the current implementation, you'll need first to ensure that the package manager's functionality is working you can do that in `src/utils/packageManagers.ts`

3. Package manager is something else
   - Feel free to implement your own package manager as needed

---

## Please only use `npm` since that's what's used in `@raycast/extensions`
