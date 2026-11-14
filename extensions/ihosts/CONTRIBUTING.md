# Developing iHosts

From this extension directory:

```sh
npm ci
npm test
npm run build
npm run lint
npm run dev
```

`npm run dev` registers the local development extension with Raycast. Open its
**iHosts** command and choose **Enable Hosts Access** to exercise authorization.
Enter administrator credentials only in the native macOS authentication dialog.

Building and running the tests does not grant access to the real hosts file.
The regression tests mock privileged commands, compile the generated AppleScript
without running it, and exercise an actual macOS ACL only on a temporary fixture.
Keep the Store README and release notes focused on installed users; put developer
setup and test instructions here.

The NPM check workflow runs `npm test` for iHosts on macOS. Keep authorization
arguments separate from the AppleScript source, preserve its interactive timeout,
and retain regression coverage for cancellation, stale permission repair, safe
writes, persisted-data fallback, and overlapping menu-bar operations.
