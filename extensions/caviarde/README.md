<div align="center">

<img src="assets/icon.png" alt="Caviarde" width="128" height="128">

# Caviarde

**Mask personal data in your clipboard before you paste it anywhere.**

A Raycast extension for macOS that redacts PII, secrets and customer identities
on the fly. One hotkey, no interface, and nothing leaves your machine by default.

[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Raycast](https://img.shields.io/badge/Raycast-extension-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://raycast.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![Local first](https://img.shields.io/badge/local--first-no%20telemetry-2ea44f?style=flat-square)](#privacy)

</div>

---

*Caviarder*, in French, means to black out a passage in a document. Censors did it
with black ink; this does it with placeholders.

You copy something with people in it. You press one key. What you paste is the
same text with the people taken out.

![Caviarde masking copied text: the clipboard holds a name, a location, an email,
a phone number, a card and an IBAN; the pasted result replaces each with a
numbered placeholder](media/screenshot.png)

A ticket, a log excerpt, a database row, an email thread, a CSV, a stack trace:
whatever is in the clipboard, the same key does the same thing.

The placeholders are numbered and stable within a paste, so a model can still
reason about who did what. `[PERSON_1]` and `[PERSON_2]` stay two different
people all the way through a conversation, and technical identifiers are left
untouched, because masked text you cannot use for a database query has failed at
its job.

## Where it helps

Anywhere the clipboard crosses a boundary it should not.

- **AI assistants and LLMs.** Pasting real data into ChatGPT, Claude, Copilot or
  a coding agent sends someone's name to a third party. This is the case that
  gets talked about, and it is not the only one.
- **Public issue trackers and pull requests.** A stack trace or a log excerpt
  attached to a GitHub issue is indexed forever.
- **Shared channels.** Slack, Teams, Discord. What you paste into a channel is
  visible to everyone in it, including people with no business reading it.
- **Pastebins, diff viewers, JSON formatters, online translators.** Convenience
  tools that quietly keep what you give them.
- **Vendor support and bug reports.** A reproduction case usually needs the
  shape of the data, not the identities in it.
- **Screenshots, demos and talks.** Mask first, then capture.
- **Handing data to a colleague** who needs to debug the problem but has no
  reason to know whose account it is.

The same reflex covers all of them: mask the clipboard, then paste.

## Install

> [!IMPORTANT]
> **Caviarde is not in the Raycast Store yet.** Until it is, build it from
> source with the commands below. It takes about a minute and needs no account.

**1. Build it.** The last command compiles the extension and registers it in
Raycast, which is all that installing means here.

```bash
git clone https://github.com/gldywn/caviarde.git
cd caviarde
mise install     # Node and pnpm, at the versions this repository pins
pnpm install
pnpm build       # compiles and registers the extension in Raycast
```

**2. Give it a shortcut.** Open Raycast Settings → Extensions, find **Caviarde →
Mask and Paste**, and record one. **⌥⌘V** sits right next to the paste you
already know.

**That is the whole setup, and it already works.** Pattern detection runs
in-process with nothing else installed: emails, phone numbers, IBANs, cards,
keys. Names in prose, places and company names need the optional detector below,
and the HUD tells you every time a paste went out without it.

### The optional detector

**Run the Set up Detector command from Raycast.** Nothing else to do: it finds
your container runtime, pulls a digest-pinned image, starts it on loopback and
waits until it answers, showing where it is the whole time. Docker Desktop,
OrbStack, Rancher Desktop and colima all work.

The first run downloads about **1.3 GB**, which you can leave running in the
background. The container then holds roughly 2.2 GB of memory and starts in
seconds. Nothing is exposed beyond `127.0.0.1`, it runs read-only with every
capability dropped, and the image is pinned by sha256 digest rather than by tag.

<details>
<summary><b>Working on Caviarde itself</b></summary>

<br>

**`pnpm dev` replaces `pnpm build`.** It registers the extension the same way,
then reloads it on every save.

**`docker compose up -d` is only for changing the detector.** It runs the same
image as *Set up Detector*, but with `assets/detector-patch/gliner_layer.py`
mounted rather than baked in, which is what you want while editing the patch or
retuning the confidence thresholds. Both listen on `127.0.0.1:5002`, so the
extension does not care which one is running. To simply use the semantic layer,
the command is enough.

**`pnpm test` runs the suite.** The integration tests skip themselves when no
detector answers, so they stay green without one.

</details>

## What it catches

**Patterns, always, with no network and no dependency.** Email addresses, French
and international phone numbers, IPv4 and IPv6, IBANs validated with mod-97,
credit cards and SIRET validated with Luhn, SIREN company numbers, API keys and
access tokens, JWTs, PEM private keys, and names written as `@mentions`. Every
match is checksum-validated where a checksum exists, so a random sixteen-digit
number is not mistaken for a card.

French identifiers are first-class rather than an afterthought, which is unusual:
most redaction tools handle US formats and stop there.

**The detector, when running.** People, places, street addresses and company
names. This is where a model earns its keep: it finds the name it has never seen
before, which is exactly the one no list would contain. A name mentioned once as
`@Camille Rousseau` is also masked when it appears three lines later as a bare
`Camille`, with the same placeholder.

When the detector is unreachable, nothing breaks. Caviarde masks with patterns
alone and names what it skipped:

```
2 masked: 1 email, 1 IBAN (partial: names and places not checked)
```

## Privacy

No telemetry. No analytics. No account. Nothing is written to disk, no mapping is
stored, and there is no unmask command: the placeholders are one-way by design.

Clipboard text never leaves your machine as long as the Detector URL points at
loopback, which is the default. That preference is the boundary of the promise,
and [docs/security-notes.md](docs/security-notes.md) says so plainly. The same
document records the byte-for-byte audit of the detector image, which is pinned
by digest: no shell, no package manager, no telemetry dependency, no injected
certificate authority.

**Detection is best-effort.** The semantic layer is a probabilistic model. It
will miss a name and it will occasionally mask something harmless, and
over-masking is the direction this tool leans, because a masked ordinary word
costs you nothing and a leaked name costs you a customer.

Caviarde reduces what you leak. It does not guarantee you leak nothing, it is not
a GDPR anonymisation measure, it has no audit trail, and it should not stand
between you and a data protection obligation. Read what you paste. The known gaps
are written down in [docs/limitations.md](docs/limitations.md) rather than
glossed over.

## Configuration

| Preference | Default | What it does |
|---|---|---|
| Detector URL | `http://127.0.0.1:5002` | Where the semantic detector lives |
| Detector Timeout | `3500` ms | Past this, fall back to patterns alone |
| Auth Token | empty | Bearer token, for a detector that is not local |
| Phone Regions | `FR` | Without a region, only `+33`-style numbers are found |
| Mask person names | on | Needs the detector, except `@mentions` |
| Mask locations and addresses | on | Needs the detector |
| Mask company and organisation names | on | Needs the detector and its patch |

Text over 6,000 characters skips the semantic layer rather than truncating it:
truncating would mask a name in the first half of a document and leave it exposed
in the second, which reads as protection that is not there. Above 1,000,000
characters nothing is masked at all and the HUD says so.

## Contributing

Read [AGENTS.md](AGENTS.md) first. The short version: no real data in this
repository, ever, and no logging of clipboard content at any level.

| Document | What it covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Module layout, the two layers, span merging |
| [docs/limitations.md](docs/limitations.md) | What is knowingly not detected |
| [docs/security-notes.md](docs/security-notes.md) | The detector image audit and why it is pinned |
| [docs/detector-patch.md](docs/detector-patch.md) | The organisation label and its Apache-2.0 attribution |

## License

MIT, except `assets/detector-patch/gliner_layer.py`, which is derived from
[PasteGuard](https://github.com/sgasser/pasteguard) and stays under Apache-2.0.
Its licence text is in [assets/detector-patch/LICENSE](assets/detector-patch/LICENSE).
