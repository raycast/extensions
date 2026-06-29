# Arhiva Raycast Extension

Raycast commands for saving, searching, editing, and organizing arhiva bookmarks.

## Development

The extension signs in through the web app and reads deployment URLs from environment variables or Raycast preferences:

- `webAppUrl` or `VITE_WEB_APP_URL`
- `convexUrl` or `VITE_CONVEX_URL`
- `convexSiteUrl` or `VITE_CONVEX_SITE_URL`

Environment variables take precedence. In Raycast development mode, missing environment variables default to the local web and Convex dev URLs, so saved production preferences do not intercept local auth handoffs. For installed builds, Raycast preferences are used when environment variables are not set.

Run locally with:

```sh
pnpm --dir apps/raycast dev
```

Validate with:

```sh
pnpm --dir apps/raycast check-types
pnpm --dir apps/raycast build
```
