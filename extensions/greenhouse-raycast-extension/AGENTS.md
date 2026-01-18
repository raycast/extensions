## Build & Run

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`

## Validation

- Tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Codebase Patterns

- API client: `src/api/harvest.ts`
- Error handling: `src/api/harvestErrors.ts`
- Job views: `src/jobs/`
- Pipeline utilities: `src/jobs/pipelineUtils.ts`
- Types: `src/jobs/types.ts`
- Root command: `src/index.tsx`

## Operational Notes

- Raycast preferences store API key (`harvestApiKey`) and optional base URL
- Uses `@raycast/api` for UI components
- Navigation uses Raycast's push/pop pattern
