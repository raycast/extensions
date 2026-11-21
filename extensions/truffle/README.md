# Truffle

Find any file on your Mac by name, by content or by meaning, from Raycast. Everything runs locally.

- **Names**: fuzzy and typo tolerant (`recete` finds `recette.md`).
- **Contents**: indexed grep (`grep:invoice`, `regex:fn\s+\w+`, `in:~/Code`).
- **Meaning**: photos, screenshots, PDF pages, documents, audio and video moments, by what they show or say
  ("a dog on the beach", "the clause about pets in the lease"), with Google DeepMind's EmbeddingGemma 2 on your
  machine. `code: …` searches your code by what it does.

| Key | Action |
| --- | --- |
| ↵ | Open (audio and video at the moment, in QuickTime Player) |
| ⌘↵ | Show in Finder |
| ⌘Y | Quick Look |
| ⌘D | Preview: PDF page, video frame, passage or matching lines |
| ⌘F | Search in this file's folder |
| ⌘⇧C / ⌘. | Copy the file / its path |

## Setup

The extension talks to the `truffle` daemon ([github.com/Azilone/truffle](https://github.com/Azilone/truffle)):

```bash
brew install azilone/tap/truffle
truffle setup
```

`truffle setup` starts the daemon at login, walks you through Full Disk Access, downloads the model (865 MB, once)
and picks the folders to search by meaning. The extension's Setup section shows anything still missing.
