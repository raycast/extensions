## Learned User Preferences

- Prefers concise fixes for code review comments, with minimal explanation and focused changes.
- Does not want regression test files added for these code-review fixes unless explicitly requested.

## Learned Workspace Facts

- This workspace is the Raycast Vercast extension; review paths prefixed with `extensions/vercast/` correspond to files under the repository root.
- Use `npm run lint` and `npm run build` as primary verification checks for extension changes.
- Vercel deployments should keep using a stored `selectedTeamId` or `teamId` when `fetchTeams()` fails; team slug lookup is best-effort.
- Dashboard URLs for team-owned deployments should prefer `deployment.team?.slug`, then selected team slug, then username.
- Raycast tool schema extraction is sensitive to imported utility types and nested array union inputs; keep tool input types explicit and validate internally.
