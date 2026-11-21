# InstaBox Manager

A Raycast extension for InstaBox sandboxes. The API client lives in `src/services/` (all requests go through `request()` in `src/services/instabox.ts`), and the API shapes in `src/types/index.ts`.

## API reference

The InstaBox OpenAPI spec is the source of truth: <https://api.instabox.sh/v1/openapi.json> (public, no key needed). Check it before adding or changing a call. Don't copy it into the repo: it changes, and a copy goes stale.

```bash
# One endpoint, by operationId
curl -s https://api.instabox.sh/v1/openapi.json | jq '.paths[][] | select(.operationId? == "createMachine")'

# The overview: conventions, API key scopes, idempotency, lifecycle, SSH
curl -s https://api.instabox.sh/v1/openapi.json | jq -r '.info.description'

# A schema
curl -s https://api.instabox.sh/v1/openapi.json | jq '.components.schemas.Machine'
```

## Rules that are easy to get wrong

- Auth is an API key starting with `ibk_`, sent as `X-API-Key`. `request()` refuses keys without the prefix.
- The API calls a sandbox a "machine" and pausing "suspend"; code keeps those names, the UI says machine and pause.
- Send an `Idempotency-Key` (`request(..., { idempotent: true })`) only where the spec lists that header: create, PATCH and DELETE of a machine; start, stop, suspend and resume; create and delete of a snapshot. Exec, SSH tokens, ports and desktop calls take none.
- Machine changes answer `202` with an `Operation`. Follow it with `waitForOperation` (a `GET /v1/operations/{id}?wait=25s` long poll).
- Machines have no lifetime timeout. `archiveSeconds` (create only, 60-86400) stops a running machine at `archiveAt`.
- `autoSuspendAfterSeconds` applies only when `GET /v1/me` has `manualLifecycle`. Otherwise the API snaps it to `idleChoicesSeconds` or ignores it for `fixedAutoSuspendSeconds`. `src/utils/idle.ts` turns this into form options.
- Errors come as `{"error": {"code", "message", ...}}`. Give a new code a title in `src/utils/errors.ts`.

## Checks

```bash
npx tsc --noEmit
npm run lint
```
