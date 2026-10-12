# Integration test reports

Run `npm run test:e2e` from the extension directory after building the native engine and downloading the pinned models. The suite creates synthetic fixtures and writes its results to `docs/e2e-results.json`.

Generated reports contain temporary local paths. They are kept out of the Store submission. Native/runtime tests and TypeScript tests are included so reviewers can reproduce the checks.
