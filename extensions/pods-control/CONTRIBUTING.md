# Contributing to Pods Control

Thanks for helping out. This folder holds only what ships to the Raycast Store. The tests, architecture notes, and full guide live in the [Pods Control Raycast extension repository](https://github.com/raulgg/raycast-extension-pods-control), so start with its [CONTRIBUTING.md](https://github.com/raulgg/raycast-extension-pods-control/blob/main/CONTRIBUTING.md).

Please [open an issue](https://github.com/raulgg/raycast-extension-pods-control/issues) before building a new feature or changing behavior. Small bug fixes do not need one.

## Sending a change

You can send a change in either repository:

- **In the Pods Control Raycast extension repository.** The automated tests only run there, so a larger change is easier to check there.
- **In the Raycast extensions repository.** Follow Raycast's [Contribute to an Extension](https://developers.raycast.com/basics/contribute-to-an-extension) guide. Run `npm install && npm run dev` in this folder, then open a pull request against `raycast/extensions`.

For a pull request in the Raycast extensions repository:

- Add a `## [Title] - {PR_MERGE_DATE}` entry to `CHANGELOG.md`.
- Add your Raycast Store handle to `contributors` in `package.json`.
- Say what you tested on real hardware: AirPods or Beats model, macOS version, and CLI version.
- Run `npm run lint` and `npm run build`.
