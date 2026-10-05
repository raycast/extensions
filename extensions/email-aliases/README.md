# Email Aliases

Create a throwaway email alias for the website you are currently on, without leaving the sign-up form.

Instead of handing every service the same address, this extension turns the site's domain into an alias:
`me@gmail.com` on `account.bvg.de` becomes `me+bvg.de@gmail.com`. If that alias ever shows up in spam,
you know exactly who leaked it.

## Commands

**Generate Email Alias** — reads the active browser tab, builds the alias and copies or pastes it right
away. Pass an optional argument to use a label of your own (`newsletter`) or another site (`example.com`)
instead of the current tab.

**Build Email Alias** — a form with an account picker, a live preview and per-run overrides for the domain
depth and the extra suffix. This is also the way to work without a browser, for example on Windows.

## Setup

The only required preference is **Email Accounts**. It is a comma-separated list and each entry can be:

| Entry | Result for `bvg.de` |
| --- | --- |
| `me@gmail.com` | `me+bvg.de@gmail.com` |
| `Work: me@company.com` | `me+bvg.de@company.com`, shown as "Work" in the picker |
| `Catch-All: @mydomain.com` | `bvg.de@mydomain.com` |

Entries starting with `@` are treated as catch-all domains, where the alias becomes the local part.

## Domain depth

Most alias tools cut the hostname at the last two labels, which quietly breaks on `amazon.co.uk`
(it becomes `co.uk`). This extension uses the Public Suffix List and counts levels **on top of the
public suffix**, so you decide how specific the alias should be.

The default is **Automatic**, which looks at the hostname and decides for itself:

| Hostname | Alias | Why |
| --- | --- | --- |
| `account.bvg.de` | `bvg.de` | `account` says nothing about who they are |
| `login.microsoftonline.com` | `microsoftonline.com` | single sign-on noise |
| `store.steampowered.com` | `steampowered.com` | `store` is a section, not an identity |
| `auth.services.adobe.com` | `adobe.com` | more than one level in front means infrastructure |
| `idp-a83f2c91.okta.com` | `okta.com` | generated hostname |
| `nas.example.com` | `nas.example.com` | a real service on your own domain |
| `mycompany.atlassian.net` | `mycompany.atlassian.net` | the tenant is the identity |
| `myproject.vercel.app` | `myproject.vercel.app` | same on multi-tenant platforms |

If you would rather decide yourself, the fixed settings are still there:

| Setting | `eu.shop.example.co.uk` becomes |
| --- | --- |
| Domain + suffix | `example.co.uk` |
| One level more | `shop.example.co.uk` |
| Two levels more | `eu.shop.example.co.uk` |
| Full hostname | `eu.shop.example.co.uk` |
| Name only | `example` |

The **Build Email Alias** command lets you switch the depth per run, so you can override the
automatic choice whenever it guesses wrong.

## Template tokens

Both the alias template and the catch-all template accept these tokens:

`{user}` `{sep}` `{label}` `{suffix}` `{alias}` `{domain}` `{host}` `{date}` `{random}`

`{alias}` is the label plus the extra suffix, which is what the default template uses.
A few examples:

- `{user}{sep}{alias}@{domain}` → `me+bvg.de@gmail.com` (default)
- `{user}-{label}-{date}@{domain}` → `me-bvg.de-2609@gmail.com`
- `{alias}@{domain}` → `bvg.de@mydomain.com` (default for catch-all accounts)

## Where the URL comes from

On macOS the extension talks to the frontmost browser through AppleScript, which needs no extra install.
Supported are Arc, Dia, Chrome, Chromium, Brave, Edge, Vivaldi, Opera, Safari, Orion, Sidekick, Comet,
Helium, Shift, Wavebox, Whale and Yandex, including their beta and canary builds.

If that fails, or if you use Firefox or Zen, the extension falls back to the
[Raycast browser extension](https://www.raycast.com/browser-extension). On Windows the browser extension
is the only source; if it is not available, use **Build Email Alias** and type the domain.

## Privacy

Everything happens locally. No alias, URL or address ever leaves your machine.
