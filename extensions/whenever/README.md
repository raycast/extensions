# Whenever for Raycast

Find your Whenever workflows, run them, and check how their runs went, all from Raycast.

## Commands

- **Search Workflows**: your workflows with their status, pinned ones first.
- **Run Workflow**: run the latest saved version of a workflow.
- **Workflow Runs**: a workflow's run history, with a step-by-step timeline for each run.
- **Whenever Account**: sign in or out.
- **Open Whenever**: open the web app.

## Good to know

- Sign in with your Whenever account the first time you use a command.
- Running a workflow uses its latest **saved** version, which can differ from the published one. Raycast asks you to confirm first, because a run can change things in your connected accounts.
- If a workflow reads input, you can type it as JSON or paste your clipboard or selected text.
- To edit workflows, connect accounts or change triggers, use the Whenever web app.
- Raycast keeps only the IDs of runs you started from it, and signing out clears them.

## Development

Use the Node.js version in `.nvmrc`, then run:

```sh
npm ci --ignore-scripts
npm run dev
```

Before opening a pull request, run `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`.

The extension is published by the `whenever-team` Raycast account, so `npm run publish` submits it to the public Raycast Store for review.

Publishing and the author check in `npm run lint` need you signed in with `npx ray login` as that account.
