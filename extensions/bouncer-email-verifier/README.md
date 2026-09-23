# Bouncer Deliverability

Check whether an email address is deliverable, or whether a domain can receive mail, with [Bouncer](https://www.usebouncer.com) — directly from Raycast.

## Requirements

- A Bouncer account
- A Bouncer API key

## Setup

1. Install the extension.
2. Open [app.usebouncer.com](https://app.usebouncer.com) and copy your API key.
3. Add the key in the extension preferences. Raycast stores it as a password preference.

## Usage

Open `Verify Deliverability`, type an address or a domain, and press Enter.

There is one command for both checks. Whatever you type decides which one runs — an address contains an `@` and a domain does not, so there is nothing to choose. A full email address, a name-and-address pair like `Bob <bob@example.com>`, a pasted signature block, or a URL all resolve to the right thing.

You can also pass it as a command argument to skip the list and go straight to the result, and it works as a Raycast fallback command. If you have an address or domain selected or on your clipboard when you open the command, it is filled in for you.

### Checking an address

Each result shows:

- **Verdict** — deliverable, risky, undeliverable, or unknown
- **Score** out of 100, plus the reason code
- **Domain signals** — free, disposable, accept-all
- **Account signals** — role address, disabled, full mailbox
- **Toxicity**, provider, and the MX record used
- **Did you mean** suggestions for typo'd addresses, verifiable in one keystroke

Every signal is listed with the value Bouncer reported for it. The extension does not add a send-or-suppress recommendation on top: Bouncer supplies the status and the signals, and what to do with an address depends on your list and your risk tolerance, not on something this extension can decide for you.

Note that the role and free signals are heuristics Bouncer applies to the local part and the domain, and they do misfire — a personal address like `mail@yourdomain.com` is often reported as a shared role mailbox. Read them as observations rather than defects.

### Checking a domain

Type a bare domain to check its mail setup without needing a specific address. Bouncer's domain endpoint returns no status or score, only the mail record it found, the provider, and whether the domain is catch-all, disposable, free, or toxic. Those are shown exactly as returned.

When you type a full address, checking the mailbox is the default and the domain check is one keystroke away on the same row — `⌘⇧D`.

### History

The last 50 results are kept locally, addresses and domains together, so you can reopen one without spending another credit. Filter by verdict, or narrow to domains only, from the dropdown in the search bar.

### Raycast AI

The extension exposes three tools to Raycast AI, so you can ask for a check in plain language or chain it into a larger task:

```
@bouncer-email-verifier is deliverable@sandbox.usebouncer.com worth emailing?
@bouncer-email-verifier does usebouncer.com have a working mail server?
@bouncer-email-verifier how many credits do I have left?
```

Verifying an address or a domain spends one credit each; reading your credit balance is free.

## Privacy

This extension ships no API key or account data. Your Bouncer API key is stored as a Raycast password preference and is sent only as a request header to `api.usebouncer.com` — never in a URL, and never written to a log.

Everything that leaves your device, in full:

- **Bouncer.** Checking an address or domain sends it to the Bouncer API, which is the point of the extension. Nothing else is sent with it.
- **Raycast AI.** If you use the AI tools, the address or domain you ask about and the result Bouncer returns are handled by Raycast AI, which means they reach the model provider behind it. Use the command directly rather than the AI tools if you would rather that not happen.

Everything else stays local:

- **Verification history** is written to Raycast's local storage on this device and is never transmitted. It holds the addresses and domains you have checked along with their results. Turn off **Save verification history** in preferences to stop recording it; existing entries are left alone until you clear them, which you can do from the command's action panel.
- **Clipboard and selection.** Opening the command reads your current text selection, then your clipboard, purely to prefill the search bar when one of them looks like an address or a domain. Nothing is sent anywhere until you press Enter.

## Development

```bash
npm install
npm run dev
```
