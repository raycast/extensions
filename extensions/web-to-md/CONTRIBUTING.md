# Contributing

```sh
npm run dev          # ray develop
npm run typecheck    # tsc over src + test
npm run test         # node:test
npm run lint         # ray lint
npm run format       # prettier over src + test
```

`tsconfig.json` includes `raycast-env.d.ts`, which Raycast generates from `package.json`. Run `npm run dev` or `npm run build` once after cloning so `npm run typecheck` can resolve the generated `Preferences` and `Arguments` types.

## Notes

Raycast surfaces `README.md` as the "About This Extension" page in the Store and in preferences, so keep it user-facing — contributor instructions belong here instead.

If both Raycast and Raycast Beta are installed, only run one at a time while developing. `ray develop` attaches to whichever is running, but `raycast://` deeplinks always resolve to stable Raycast, so with both open you can end up testing a stale build. Beta answers on `raycast-x://`.
