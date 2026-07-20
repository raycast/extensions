# Bouncer Email Verifier

Verify email deliverability with Bouncer directly from Raycast.

## Requirements

- A Bouncer account
- A Bouncer API key

## Usage

1. Install the extension.
2. Add your Bouncer API key in the extension preferences.
3. Open `Bouncer`.
4. Type an email address and press Enter.

The command shows the deliverability verdict, score, provider, domain, and mailbox signals returned by Bouncer.

## Privacy

This extension does not include any API key or account-specific data. Your Bouncer API key is stored as a Raycast password preference.

When you verify an email address, the extension sends that email address to the Bouncer API so Bouncer can return a deliverability result.

## Development

```bash
npm install
npm run dev
```
