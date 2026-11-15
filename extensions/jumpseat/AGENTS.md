# Jumpseat Raycast guidance

- This is a TypeScript Raycast extension using npm. Preserve compatibility with the Raycast APIs and the supported macOS and Windows command surfaces; the menu bar command remains macOS-only.
- Preserve the fixed Jumpseat API and web origins, OAuth/PKCE behavior, token storage, and the scopes (`flights:upcoming:read` on the released flow; `flights:upcoming:read flights:past:read` on central OAuth) unless a coordinated compatibility change is approved.
- A user may view their own private booking details. Never request or display friends' booking details, and never expose tokens or credentials in UI, logs, or errors.
- Run `npm test`, `npm run lint`, and `npm run build` for affected code changes. Fix failures introduced by the requested change; docs-only changes need lightweight validation.
- Do not run `npm run publish`, submit to the Raycast Store, or change live OAuth configuration unless the user explicitly requests that external action.
- Before finishing, inspect the diff, run `git diff --check`, and report verification performed and remaining risk.
