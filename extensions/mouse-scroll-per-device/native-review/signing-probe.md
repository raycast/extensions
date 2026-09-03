# Signing probe

Run these commands from this extension directory to inspect the exact helper included in the reviewer draft:

```sh
lipo -archs assets/bin/mouse-scroll-helper
codesign -dv --verbose=4 assets/bin/mouse-scroll-helper
codesign --verify --strict --verbose=2 assets/bin/mouse-scroll-helper
shasum -a 256 assets/bin/mouse-scroll-helper
```

Observed result for the reviewed artifact:

- architectures: `arm64 x86_64`
- signature: ad-hoc
- Team Identifier: not set
- strict verification: unsuccessful
- notarization evidence: not provided

This is deliberate evidence of a blocked candidate, not evidence of an installable helper. A stable Apple signing identity and an approved Raycast packaging path are prerequisites to the ordinary macOS permission and helper-start flow.
