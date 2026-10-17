# Publishing SSH Proxy Router

## Validation

```sh
npm ci
npm run check
npm run test:live
```

The first two commands run in GitHub Actions. The live test runs only on a configured Mac; do not put SSH credentials, diagnostic snapshots, or private website logs in Actions or release notes.

## Prepare a release

Run the **Prepare release** workflow on `main`, entering a new version such as `v0.1.0`:

```sh
gh workflow run release.yml --ref main -f version=v0.1.0
```

The workflow validates the selected commit, builds a `.rayext` bundle, exports the committed source, and creates a draft GitHub Release with checksums. It rejects existing tags or releases. Inspect the run and draft before publishing the GitHub Release. The release number is independent of the Raycast SDK version.

A GitHub Release is not a Raycast Store publication. Store submissions require Raycast's review and approval.

## Submit to Raycast locally

The public Store publisher is interactive. Submit locally using your GitHub login; no publishing token is stored in CI. The Raycast account username in the manifest is `mariusrueve`.

Use the documented manual submission route at <https://developers.raycast.com/basics/publish-an-extension>:

1. Check out the exact commit identified in the validated release, using a clean working tree.
2. Fork `raycast/extensions` to your GitHub account and create a branch from its current `main`.
3. Export the extension with `npm run store:export`. Extract `release/store-source.tar.gz` into `extensions/ssh-proxy-router` in the fork. The export includes only committed extension source, tests, configuration, documentation, and media. It excludes `.github` workflows and generated artifacts.
4. Run `npm ci` and `npm run check` inside that extension directory. Confirm the PR changes only this extension directory.
5. Commit and push the branch, then open a pull request against `raycast/extensions:main` with maintainer edits enabled. Include a screenshot, setup requirements, and test results using example hosts only.
6. Respond to automated checks and review feedback. Raycast publishes the extension after accepting and merging the PR. Only then add the confirmed Store installation URL to the README.

For updates, bring in any changes already accepted in Raycast's repository before exporting a new version. Review and reconcile differences rather than overwriting community contributions. Add a changelog entry with `{PR_MERGE_DATE}` for each new submission.

## Runtime setup and removal

Users need a working SSH gateway, key or agent authentication, and Python 3 at `/usr/bin/python3`. Confirm the SSH host key in Terminal before starting routing. The extension invokes macOS `ssh`, `launchctl`, and `networksetup`; starting routing changes automatic-proxy settings for the configured network services and installs two per-user LaunchAgents.

The SSH tunnel and PAC server can remain running after Raycast closes. **Stop SSH Proxy Router before uninstalling the extension** to restore the previous proxy settings and disable the LaunchAgents. Their stable plist files and local diagnostic state remain in the user's Library and state directory; the extension does not upload them.
