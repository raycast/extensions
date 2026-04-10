# Testing

## Automated Checks

- `npm run validate`
  Runs lint, typecheck, and the Vitest unit test suite.
- `npm run build`
  Confirms the extension still builds with Raycast.
- `npm run test:api-live`
  Runs the opt-in live API check against `skills.sh`.

## UI Smoke Checklist

Run these checks in Raycast before shipping UI-affecting changes.

### Search Skills

- Enter fewer than 2 characters and confirm the guidance empty state is shown.
- Run a normal search and confirm results render with the detail panel.
- Search for a query with no matches and confirm the empty result copy is shown.
- Trigger an API failure and confirm the error detail view shows `Retry` and `Report Issue on GitHub`.

### Manage Skills

- Confirm installed skills load normally, including the detail panel and update badges.
- Select an agent filter with no matching installed skills and confirm the filter empty state is shown.
- Trigger a CLI failure and confirm the error detail view shows `Retry`.
- Trigger an `npx` resolution failure and confirm the recovery guidance points to **Custom npx Path**.

### Skill Detail

- Confirm `SKILL.md` content renders when available.
- Confirm the fallback to repository `README.md` works when `SKILL.md` is missing.

### Actions

- Install a skill and confirm the list refreshes.
- Remove a skill and confirm the list refreshes.
- Update a skill and confirm the update badge disappears afterward.

### Preferences

- Set a custom `npx` path in extension preferences and confirm Manage Skills still loads correctly.
