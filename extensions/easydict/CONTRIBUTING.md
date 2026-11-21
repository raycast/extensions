# Contributing to Easydict

Thanks for your interest in improving Easydict. This repository is the development home of the extension. The copy under [`raycast/extensions/extensions/easydict`](https://github.com/raycast/extensions/tree/main/extensions/easydict) is a release mirror maintained for the Raycast Store, not the place to develop it.

## Why develop here

- `raycast/extensions` is a huge shared monorepo: a full clone is several GB (the recommended sparse checkout stays awkward), and its issues and pull requests cover every extension.
- This repository is where the tests, CI, release tooling, and roadmap live. A change can be discussed and reworked here until it fits, before the finished release is mirrored to the Store.

If you already opened a change against `raycast/extensions`, open it here as well.

## How to contribute

You need [Raycast](https://www.raycast.com/) and Node.js 22 or newer.

```bash
git clone https://github.com/tisfeng/Raycast-Easydict.git
cd Raycast-Easydict
npm install
npm run dev
```

1. Branch from `dev/release` — `main` only carries released code.
2. Run the CI checks before opening the pull request:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. Open the pull request against `dev/release` with a conventional title: `type(scope): summary`.

## Guidelines

- Keep changes focused; describe the user-visible effect and how you tested it.
- Add tests for new behavior and regressions.
- Update `README.md` (and `README_ZH.md` if you can) for user-visible changes.
- Don't edit `CHANGELOG.md` or `src/consts.ts`; maintainers curate release notes and versions.
- For larger changes, open an issue first.
- [`AGENTS.md`](AGENTS.md) summarizes the architecture and `docs/development/` has focused guides.

## Issues and security

Bug reports and feature requests go to the [issues](https://github.com/tisfeng/Raycast-Easydict/issues); include your versions, OS, and reproduction steps. Report security vulnerabilities privately per [`SECURITY.md`](SECURITY.md).
