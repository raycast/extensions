# p00f for Raycast

Create zero-knowledge, ephemeral [p00f.me](https://p00f.me) links from Raycast. Encryption happens locally in the extension. The hosted service only ever holds ciphertext.

## Commands

- **Create Poof**: full form for text or one file. Pick TTL, Reveal budget, PIN, secret-kind masking, masked URL mode, reveal-anchored TTL, viewer-delete, reveal captcha, and countdown.
- **Poof Selection**: turns selected text into a Poof. When Finder is frontmost with exactly one file selected, shares the file bytes instead.
- **Poof Clipboard**: turns one clipboard file, plain text, or HTML-as-text fallback into a Poof.

Every successful create copies the resulting Link to your clipboard using Raycast's concealed clipboard option, so the Link is not added to Clipboard History. Optionally, paste the Link into the frontmost app via a preference.

## How it works

1. The extension generates a 32-byte master key on your Mac.
2. Your content is encrypted locally with AES-GCM via [`@p00f/core`](https://www.npmjs.com/package/@p00f/core).
3. Only the ciphertext is uploaded to [p00f.me](https://p00f.me). The Fragment Key stays in the URL fragment of the resulting Link, which the server never sees.
4. Whoever holds the Link can Reveal the content. After the configured TTL or Reveal budget runs out, the Poof burns server-side. The CDN is bypassed and responses are `no-store`, so cached ciphertext cannot outlive a burn.

The extension sends no client-identifying headers. The hosted p00f service treats it as just another anonymous machine-path client, with the same rate limit floor as the `poof` CLI.

## Preferences

Set defaults once in Raycast Preferences:

- **p00f Base URL**: hosted `https://p00f.me` (default) or a self-hosted base URL.
- **Default TTL**: 1 minute to 30 days.
- **Default Reveal Budget**: 1 / 3 / 10 / Unlimited until TTL.
- **Reveal-Anchored TTL**: start the timer on first Reveal.
- **Viewer Delete**: let the viewer delete the Poof.
- **Reveal Captcha**: require a browser captcha on Reveal.
- **Open After Create**: open the Link in the browser after a successful create.
- **Paste After Create**: paste the Link into the frontmost app (concealed copy still happens either way).

Per-Poof overrides for everything above are available in the **Create Poof** form.

## Owner tokens

Every Poof has an owner token that can burn it early, independent of the TTL or Reveal budget. The extension does not persist owner tokens. The **Create Poof** result screen exposes the owner token once via a `Copy Owner Token` action and offers `Burn Now` while the result is open. If you close that screen without copying the token, only the TTL or Reveal budget will burn the Poof.

Quick commands (**Poof Selection**, **Poof Clipboard**) do not surface the owner token at all. If you need it, use **Create Poof**.

## Trust model

- Encryption is caller-side. The Fragment Key never reaches the server.
- The extension sends no Raycast-identifying or client-identifying headers.
- Anonymous machine-path rate limiting is the same floor used by the `poof` CLI. If p00f returns `429`, the extension reports it and leaves your clipboard untouched.
- Links and owner tokens are copied with Raycast's `concealed: true` option so they do not enter Raycast Clipboard History.
- Owner tokens are not persisted.

See [SECURITY.md](https://github.com/mcdays94/p00f/blob/main/SECURITY.md) for the full trust model.

## Local development

This package lives at `packages/raycast/` in the [`mcdays94/p00f`](https://github.com/mcdays94/p00f) repository.

```sh
git clone https://github.com/mcdays94/p00f.git
cd p00f
npm install --prefix packages/raycast
npm link --prefix packages/raycast ../core    # link the in-repo core for live iteration
npm run build --prefix packages/core          # build the in-repo core (re-run after changing packages/core/src)
npm run dev --prefix packages/raycast
```

Build, lint, and full repo tests:

```sh
npm run check --prefix packages/raycast     # build + ray lint
npx vitest run --reporter=verbose           # full repo suite
```

The Raycast lint will report a non-blocking warning if the manifest title casing drifts. Brand wordmark is `p00f`. Manifest title is `P00f` to match Raycast convention.

## License

MIT. See [LICENSE](https://github.com/mcdays94/p00f/blob/main/LICENSE).
