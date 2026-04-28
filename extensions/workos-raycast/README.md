# WorkOS

Calm quick capture for WorkOS. The extension keeps the Raycast surface tiny so tasks leave your head without dragging you into another workspace.

- `Create Task` captures a task, priority, date, and optional exact project name.
- `Open WorkOS` opens the deployed workspace.

## Setup

1. Set `RAYCAST_API_SECRET` in the WorkOS Vercel project.
2. In Raycast preferences, set:
   - `WorkOS URL`: your deployed app URL.
   - `API Token`: the same value as `RAYCAST_API_SECRET`.
   - `Account Email`: the WorkOS account to capture into.
   - `Workspace ID`: optional.

## Store Preparation

Before submitting to the Raycast Store:

- Confirm `author` in `package.json` matches the Raycast username that will publish it. It is currently set to `rees` because Raycast validates that handle.
- Run `npm run lint`.
- Run `npm run build`.
- Capture screenshots from `npm run dev` for the store review.
- Publish with `npm run publish` when signed into Raycast.
