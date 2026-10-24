# Contributing

Thanks for helping improve the Pods Control Raycast extension. This page explains where to report bugs, where to propose ideas, and where to send code.

The Pods Control Raycast extension lives in two places:

- **The Pods Control Raycast extension repository**, [raulgg/raycast-extension-pods-control](https://github.com/raulgg/raycast-extension-pods-control). This is where the Pods Control Raycast extension is developed and where discussions happen.
- **The Raycast extensions repository**, [raycast/extensions](https://github.com/raycast/extensions), under `extensions/pods-control`. This is what the Raycast Store publishes.

The maintainer keeps the two in sync. You may be reading this file from either of them, or from a local copy, so every instruction below names the repository it refers to.

## Where things go

| I want to...                         | Do this                                                                                                                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report a bug                         | Open an issue in the [Pods Control Raycast extension repository](https://github.com/raulgg/raycast-extension-pods-control/issues)                                                                                                                                                 |
| Propose a feature or discuss an idea | Open an issue in the [Pods Control Raycast extension repository](https://github.com/raulgg/raycast-extension-pods-control/issues) before writing code                                                                                                                             |
| Submit code                          | Open a pull request in the [Pods Control Raycast extension repository](https://github.com/raulgg/raycast-extension-pods-control) **or** directly in the [Raycast extensions repository](https://github.com/raycast/extensions). Both are fine. See [Sending code](#sending-code). |
| Report a CLI or hardware problem     | Open an issue in the [pods-control CLI repository](https://github.com/raulgg/pods-control/issues). The Pods Control Raycast extension only runs the CLI.                                                                                                                          |

> **Status.** The Pods Control Raycast extension is not in the Raycast Store yet, so there is no `extensions/pods-control` directory in the Raycast extensions repository for now. Until the first release lands, everything goes through the Pods Control Raycast extension repository.

## Discuss ideas first

Please open an issue in the [Pods Control Raycast extension repository](https://github.com/raulgg/raycast-extension-pods-control/issues) before building a new feature or changing behavior. Small bug fixes do not need one.

Why: Raycast will not merge significant changes to an extension without the author's sign-off, so agreeing on the idea first means your pull request will not stall in review. It also settles whether the change belongs in the extension or in the [pods-control CLI](https://github.com/raulgg/pods-control), and lets the maintainer point you at the relevant notes in [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md) before you start.

You can also open issues in the Raycast extensions repository (Raycast labels them per extension), but the Pods Control Raycast extension repository is preferred so discussions stay in one place.

## Sending code

You are not required to open your pull request in the Pods Control Raycast extension repository. Pick whichever suits you:

**Directly in the Raycast extensions repository.** Follow Raycast's [Contribute to an Extension](https://developers.raycast.com/basics/contribute-to-an-extension) guide: use the **Fork Extension** action in Raycast (or a [sparse checkout](https://developers.raycast.com/information/developer-tools/forked-extensions), since the Raycast extensions repository is very large), run `npm install && npm run dev` inside `extensions/pods-control`, then open a pull request against `raycast/extensions` `main`. The maintainer is pinged automatically as code owner, reviews it there, and syncs the merged change back into the Pods Control Raycast extension repository. This path gives you full credit: you are the pull request author, which is what Raycast's contributor credits are based on.

**In the Pods Control Raycast extension repository.** Fork [raulgg/raycast-extension-pods-control](https://github.com/raulgg/raycast-extension-pods-control), branch from `main`, run `npm ci` and `npm run dev` from the repository root. After review and merge, the maintainer publishes the change to the Raycast extensions repository. Because Raycast's publish tooling opens that pull request from the maintainer's account, your credit is preserved in the commit: you are recorded as the commit author, or as co-author (`Co-authored-by:`) when several people contributed, so the change shows up on your GitHub profile and in the history of the Raycast extensions repository. Raycast's own contributor credits, however, go to whoever opens the pull request in the Raycast extensions repository. If that matters to you, use the direct path above, or run `npm run publish` from your own clone of the Pods Control Raycast extension repository once your change is merged there; that opens the Raycast pull request under your account.

In both repositories:

- `npm run dev` loads the Pods Control Raycast extension into Raycast from the directory you run it in and reloads on changes. You need macOS, Raycast, and the [pods-control CLI](https://github.com/raulgg/pods-control) installed to exercise the commands end to end.
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for the module map, dependency rules, and the behavior contracts a change must preserve, and [TESTING.md](TESTING.md) for the test projects, conventions, and what each suite can prove. Both files ship alongside this one in either repository.
- Update [CHANGELOG.md](CHANGELOG.md) with a `## [Title] - {PR_MERGE_DATE}` entry. Raycast fills in the date on release.
- Add your Raycast Store handle to `contributors` in `package.json`. This is the credit shown on the Store page, and it makes you a code owner for future changes.
- Say what you tested on real hardware (AirPods or Beats model, macOS version, CLI version). Automated tests stub Raycast, the CLI, and Homebrew, so they cannot prove device behavior.
- Run the checks before opening the pull request:

```sh
npm test
npm run type-check
npm run lint
npm run build
```

Commit messages use a light conventional style (`fix:`, `feat:`, `docs:`, `refactor:`, `test:`, `chore:`) with a short imperative summary.

## How sync works

For the maintainer, and for anyone curious why both paths are safe.

- **From the Raycast extensions repository to the Pods Control Raycast extension repository.** When a pull request touching `extensions/pods-control` merges in `raycast/extensions`, the maintainer runs `npx @raycast/api@latest pull-contributions` on `main` of the Pods Control Raycast extension repository. It brings the upstream changes in as a single `Pull contributions` commit; conflicts are resolved with `git add` and `git merge --continue`. If the CLI cannot fast-forward, the fallback is `git format-patch -1 <merge-commit> -- extensions/pods-control` from a sparse checkout of `raycast/extensions`, applied at the root of the Pods Control Raycast extension repository with `git am -p3`.
- **From the Pods Control Raycast extension repository to the Raycast extensions repository.** The maintainer runs `pull-contributions` first, then `npm run publish` from the root of the Pods Control Raycast extension repository. That pushes the extension to the `ext/pods-control` branch of the maintainer's fork of `raycast/extensions` and opens or updates the pull request there. Contributors are credited as commit author or co-author, in `CHANGELOG.md`, and in `contributors`.
- Automating this (mirroring pull requests merged in the Pods Control Raycast extension repository to `raycast/extensions` with the contributor as commit author) is on the list to research. Until then it is a manual step, so there can be a short delay between a merge in the Pods Control Raycast extension repository and the Store release.

## Ground rules

- The Pods Control Raycast extension runs the pods-control CLI and reads back macOS state. Anything that needs a new CLI capability starts in the [pods-control CLI repository](https://github.com/raulgg/pods-control).
- Keep command names, entrypoint filenames, and preference keys stable; users have shortcuts and settings bound to them.
- Raycast's [Store guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [Community Guidelines](https://manual.raycast.com/community-guidelines) apply to every change, in either repository.

Contributions are licensed under the [MIT License](LICENSE), like the rest of the project.
