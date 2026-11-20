# Publishing MyIP to the Raycast Store

Status checked 2026-11-18 (Asia/Shanghai).

## Current status

| Check | Status | Notes |
| --- | --- | --- |
| Tests | ✅ | `npm test` — 6/6 passing |
| Build | ✅ | `npm run build` exits 0 |
| Lint | ✅ | `npm run lint` exits 0 |
| Author | ✅ | `jiyongfeng`; `ray profile` shows the same account |
| License | ✅ | MIT |
| Lockfile | ✅ | `package-lock.json` uses `registry.npmjs.org` only |
| Icon | ✅ | custom 512×512 PNG “IP” wordmark, not the default icon |
| Git commit | ✅ | this commit; working tree clean after it |
| Raycast login | ✅ | `ray profile` works |
| Public files | ✅ | README/tests use `192.168.1.42` and `203.0.113.42` |
| UI language | ✅ | `Internal IP` / `External IP` |
| Screenshots | ⏳ | add 3–6 PNGs at 2000×1250 |
| CHANGELOG | optional | recommended for Version History |

## Publish commands

```bash
npm run build
npm run lint
npm run publish
```

`npm run publish` authenticates with GitHub, opens a PR against `raycast/extensions`, and updates the same PR on later runs. Once reviewed and merged, Raycast publishes the extension automatically.

## Screenshots

1. Create `metadata/` in the extension root.
2. Set a Window Capture hotkey in Raycast Advanced preferences.
3. Run `npm run dev` and open My IP.
4. Press the hotkey, enable **Save to Metadata**, and click the camera.
5. Repeat for 3–6 screenshots.
6. Use 2000×1250 PNG, 16:10, one background, no dark-mode pairing.
7. Redact real public IPs, internal IPs, and MAC addresses before publishing.

## Store notes

- The Raycast default icon is rejected; the custom IP icon is already in place.
- Store review expects US English UI; the current labels are English.
- `README.md` is optional but useful. `CHANGELOG.md` is optional and recommended.
- Use npm and keep `package-lock.json` on the official registry.
- Do not include real IPs or other machine details in screenshots or README examples.
