# Composer helper

`WaitForComposer.swift` is the complete source for `assets/wait-for-composer`.
It uses Apple's AppKit and Accessibility APIs, with no third-party native dependencies.

The bundled executable contains both `arm64` and `x86_64` slices targeting macOS 12
or later. End users do not need a compiler or Xcode Command Line Tools.

To rebuild it on macOS with Xcode Command Line Tools installed:

```sh
npm run build:native
```

The build script compiles the same source for both architectures, merges the
executables with `lipo`, applies an ad-hoc code signature, verifies the signature
and architecture slices, and prints the SHA-256 checksum. It does not download
code or embed credentials. Temporary build products are removed automatically.

The build also records source and binary SHA-256 hashes in `native/build.json`.
`npm run verify:native` checks those hashes and, on macOS, both architecture
slices and the signature. CI checks the committed binary before rebuilding it.
Publishing verifies the recorded binary without replacing it.

The helper accepts only a destination URL and composer label as process
arguments. Prompt text arrives over standard input. Its standard output is a
status such as `filled`, `draft`, or `timeout`, never the user's prompt.

Before entering text, it checks that Chrome is foreground, the focused element
is the expected composer, and that element belongs to the expected HTTPS host
and new-chat path. It preserves a different existing draft. If Chrome's editor
does not allow direct Accessibility text entry, it rechecks the exact focused
composer and invokes Chrome's Paste menu action, independently of keyboard
layout. It temporarily uses the system clipboard with transient/concealed
markers and disables Universal Clipboard for that write. It restores previous
contents on completion or SIGTERM/SIGINT, unless the user has copied something
newer. Forced termination such as SIGKILL cannot be handled. It never presses Send.
