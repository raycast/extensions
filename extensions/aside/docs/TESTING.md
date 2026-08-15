# Testing

## Automated checks

Run these before each release:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Unit tests cover URL classification, query encoding, AppleScript interpolation escaping, structured-response parsing, Unicode, quotes, backslashes, and newlines.

## Manual smoke matrix

Use disposable tabs/windows for destructive tests. Do not close pre-existing user tabs.

- [ ] Aside not running: Search Tabs launches Aside and returns a usable list.
- [ ] Aside running with no windows: a usable normal window is created.
- [ ] Multiple windows: every window appears with its native ID and current index.
- [ ] Normal and incognito windows: both appear and incognito tabs are marked.
- [ ] Duplicate URLs/titles: actions target the selected native tab ID only.
- [ ] Stale tab: close a disposable tab outside Raycast, then confirm the action reports a stale tab and refreshes.
- [ ] Long title and URL: the list stays responsive and tooltips preserve the full URL.
- [ ] Quotes, backslashes, tabs, Unicode, and line breaks: the list renders without JSON errors.
- [ ] Slow-loading page: loading state appears without blocking other tabs.
- [ ] Permission denial: the error explains the Automation setting and opens it.
- [ ] Bookmarks: nested bookmarks from both supported roots are searchable.
- [ ] New tab, normal window, and incognito window each create exactly one requested object.
- [ ] After an Aside update: compare the installed `sdef` with the capability baseline and repeat this matrix.
- [ ] Raycast AI: `@aside open raycast.com` selects Open Tab and finishes without a subprocess.
- [ ] Raycast AI: finding, selecting, reloading, copying, and bookmark search compose the expected tools.
- [ ] Raycast AI: Close Tabs shows one confirmation; canceling closes nothing.
- [ ] Raycast AI: Close Tabs shows current Aside titles and URLs, ignores supplied titles, and rejects stale IDs before confirmation.
- [ ] Raycast AI: a space/profile request clearly reports that the scripting dictionary cannot select one.
- [ ] Aside version mismatch: a non-blocking compatibility notice appears and browser commands remain usable.

## Clean-install check

1. Remove the development extension from Raycast.
2. Restart Raycast and Aside.
3. Install from a clean checkout with `npm install && npm run dev`.
4. Accept Automation permission only when prompted.
5. Exercise all ten commands and verify the first-run instructions.
