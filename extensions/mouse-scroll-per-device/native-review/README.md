# Native helper reviewer packet

## Draft status

This extension is a **blocked reviewer draft**, not a request to publish an operational Store release. The repository contains source for its persistent native helper and the exact universal helper artifact reviewed by the manifest in this directory.

The reviewed helper contains `arm64` and `x86_64` slices. Its current code signature is ad-hoc and has no Team Identifier. It therefore cannot establish a stable macOS TCC identity for Input Monitoring or Accessibility. No Developer ID Application identity is available for this candidate.

Accordingly, helper installation/start, macOS permissions, physical-device behavior, WF, Audition, and live verification are **unverified**. The extension deliberately blocks its ordinary setup flow when the packaged helper identity is invalid; it must not be treated as usable by end users.

## Reviewer question

What is Raycast's supported path for an extension that needs a persistent native helper with Input Monitoring and Accessibility access?

Specifically, please advise whether Raycast expects one of the following, and what evidence is required for each:

1. a source-built helper produced during Raycast's build/review pipeline;
2. a reviewed and traceable binary included with the extension, with Raycast-managed signing and notarization; or
3. another approved packaging, signing, and notarization process.

The required decision covers stable runtime identity for TCC, the source-to-binary review boundary, and notarization. This draft stays blocked until that path is confirmed and a signed helper is verified in the ordinary setup flow.

## Public evidence

- [`reviewer-artifact-manifest.json`](reviewer-artifact-manifest.json) records the package, icon, native-source, and helper hashes plus the observed signature state.
- [`signing-probe.md`](signing-probe.md) explains the reproducible signature probe and its result without publishing machine-specific data.
- `native/MouseScrollHelper` contains the helper source and tests.

Raycast's binary guidance says not to bundle opaque binaries, and permits a binary extracted from a package only when its source/build is traceable; it notes that a Raycast team member should add such a binary until copy/compare CI is integrated. See [`docs/basics/prepare-an-extension-for-store.md`](../../../docs/basics/prepare-an-extension-for-store.md#binary-dependencies-and-additional-configuration) in this repository.
