# Per-Device Mouse Scroll

Customize scroll direction and speed independently for each connected mouse, without changing macOS's global scroll preference. Rather than one global direction switch, stable mice keep their own profiles.

## Current distribution status

This is a **blocked reviewer draft**, not an installable Store release. It includes a universal native helper, but that helper is ad-hoc signed with no Team Identifier. macOS cannot use that identity for stable Input Monitoring and Accessibility grants, so the extension must not offer helper installation, permission setup, or helper start to ordinary users yet.

The requested reviewer decision is documented in [`native-review/README.md`](native-review/README.md). Until Raycast confirms the supported source-build, binary-review, signing, and notarization path for this persistent TCC helper—and a signed release is verified—the helper, permissions, per-device transformation, WF, Audition, and live behavior remain unverified.

## Intended Raycast flow after release approval

1. Open **Change Mouse Scroll** in Raycast.
2. Review **Setup** first. A signed, validated helper must be installed before macOS permission setup is available.
3. Start the helper only after both permissions show ready.
4. Select a mouse and choose its vertical and horizontal direction and speed.
5. Save the profile. The helper applies profiles only after it can correlate a physical mouse to its scroll events.

Each profile belongs to a stable physical-device identity, using a serial number or location ID. If two identical mice cannot be safely distinguished, the extension marks them **Identity Ambiguous** and does not save a shared profile that could change the wrong mouse.

## Permissions and privacy

The helper needs **Input Monitoring** to observe device input and **Accessibility** to transform matching scroll events. Profiles are stored locally at `~/Library/Application Support/MouseScrollPerDevice/profiles.json` using atomic replacement. This extension does not use another mouse utility's preferences or configuration.

## Troubleshooting after a signed release is available

- **Signed Helper Required** — do not install or start an ad-hoc helper. Use a Store release whose helper identity passes the setup check.
- **Input Monitoring or Accessibility needs approval** — use the matching **Open … Settings** action, then refresh status.
- **Identity Ambiguous** — reconnect the mouse directly, or use a mouse that reports a serial number or stable location ID.
- **Helper Identity Mismatch** — do not proceed with that executable; restore the helper supplied with this extension.

## Contributing

The native helper source and tests live in `native/MouseScrollHelper`. Contributors can run the repository checks from the project root; release signing and distribution are maintained separately.
