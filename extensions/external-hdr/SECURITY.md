# Security and the `hdrctl` binary

This extension ships a compiled helper, `assets/hdrctl`. This document says exactly what it is, what it does, and how to verify it — for reviewers and for anyone who does not want to trust a binary.

## Why a binary at all

macOS has no public API to turn HDR on or off for an external display. The only mechanism is the private `MonitorPanel` framework:

```objc
@interface MPDisplay : NSObject
- (BOOL)preferHDRModes;
- (void)setPreferHDRModes:(BOOL)enabled;
@end
```

That call is not reachable from a Raycast extension: extensions run in Node and cannot call CoreGraphics or link frameworks. A small native helper is the only way to do this without asking the user to install another app.

## Scope of the binary

`hdrctl` is built from `tools/hdrctl.m` (single file, no third-party code) and does four things:

| Command | Effect |
|---|---|
| `list` | reads connected displays and their HDR state |
| `get` | reads one display's HDR state |
| `set` | calls `setPreferHDRModes:` and polls until it takes effect |
| `watch` | waits for display connect events and applies rules from a JSON file |

It does **not**:

- open network connections, sockets or URLs
- spawn processes or invoke a shell
- read or write files other than the rules file passed to `watch`
- load code at runtime: `MonitorPanel` is linked at build time, no `dlopen`, no `NSBundle`
- require root, admin, SIP changes, TCC permissions, Accessibility, Automation, or entitlements
- collect telemetry, identifiers or display contents

The only display property it touches is `preferHDRModes`. It never calls `CGDisplaySetDisplayMode`.

## Reproducing it

```sh
make
shasum -a 256 assets/hdrctl
```

`tools/hdrctl.m` is the entire source. CI (`.github/workflows/build.yml`) rebuilds it on `macos-latest` and runs `hdrctl list` on every push, so a binary that does not correspond to the source would drift from a build that still compiles. Note that Mach-O builds are not bit-reproducible across SDK versions, so the committed binary is not expected to be byte-identical to a CI build — only to derive from the same source.

The binary is universal (`arm64` + `x86_64`) and ad-hoc signed (`codesign -s -`).

## If you would rather not run it

The extension cannot work without it. The alternative is to drive System Settings through AppleScript, which needs Accessibility and is markedly slower; it is documented in the README's troubleshooting section but not implemented.

## Reporting

Open an issue at https://github.com/kindafun/hdr-toggle/issues.
