# Raycast Store submission

Publishing this GitHub repository does **not** publish an extension in the Raycast Store. Raycast reviews an extension pull request in [raycast/extensions](https://github.com/raycast/extensions); merging that pull request makes the extension available in the Store.

## Publishing account

- `package.json` → `author` is `juhas96`, verified against the maintainer's signed-in Raycast profile. This must always be a **Raycast username**, not merely a GitHub or Mac account name.
- Run `npx ray login` to authenticate the Raycast CLI. Do not commit tokens or credentials.
- The public publishing flow also requests GitHub authentication to prepare the Store pull request.

## Prepare and submit

```sh
npm ci
npm run build
npm test
npm run lint
npm run lint:store
npm run publish
```

Do not submit until all validation passes. Review the generated pull request and respond to Raycast's review. Publication is not immediate and approval is not guaranteed.

Three 2000 × 1250 PNG screenshots are included in `metadata/` for the Store and `media/` for the README. They show live resources, seven-day history, and provider-independent worktrees. The images are actual Raycast UI captures of an isolated preview with synthetic data and disabled cleanup actions, scaled and framed for the Store. No personal history or private project names are published. The preview data is not included in the installed extension.

## Native helper provenance

`assets/inspector` is generated entirely from `native/Inspector.swift` using Apple's Swift compiler, the macOS SDK, and system SQLite/AppKit/Darwin frameworks. `scripts/build-native.sh` compiles arm64 and x86_64 for macOS 13+, combines them with `lipo`, and applies a local ad-hoc signature. Rebuild it using `npm run build:native`. The helper has no privileged installation, Keychain access, network access code, separate daemon, or runtime download.

The Store reviewer should examine both the Swift source and the build recipe. The included binary is traceable to this source, but Swift versions and SDK changes can change its bytes. The target supports both architectures; Intel and macOS versions older than the development machine have not yet been runtime-tested. Raycast may request changes to how this helper is packaged.

The single-target destructive actions are explicit and confirmed. Force actions remain separate. Tests create disposable worktrees; live process/container safety fixtures are opt-in. Resource history and diagnostics remain local and must never be included in a submission.

Official references: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store), [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).
