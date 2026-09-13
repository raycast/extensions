# Security

The gateway token is a password for the Grok Bot computer. Anyone who has the token and can reach the Serve URL can call the Sand gateway as you.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/MaisonnatM/grok-bot/security/advisories/new).

Do not file a public issue for a leaked token, an exposed gateway, or a patch that would help someone reach a live gateway. Do not paste a token, a `gateway.env` file, or a Serve URL that is still live into GitHub, chat, or a screenshot.

## What this extension stores

Raycast **Gateway Token** is a password field in extension preferences.

`~/.config/grok-bot-raycast/gateway.env` is a fallback when those preferences are empty. The directory mode must be `700`. The file mode must be `600`. The file must be a regular file, not a symlink, and must not be group or world readable. The extension refuses a file that fails those checks and shows **Can't use gateway.env**.

Do not commit `gateway.env`, `.env`, or `gateway.json`.

## How you must reach the gateway

Use Tailscale Serve on your tailnet only. Keep the Sand gateway on `127.0.0.1` on the Bot computer.

Do not use Tailscale Funnel. Do not bind port `1340` to a public interface. Do not point **Gateway URL** at `127.0.0.1` on the Mac. That address is not the Bot computer.

## Scope

This policy covers this extension's handling of the gateway URL and token, the `gateway.env` permission checks, and token redaction in error strings.

It does not cover the undocumented Sand gateway itself, Tailscale, or the Grok Bot desktop app. This extension is unofficial. When Grok Bot releases an official API, the gateway contract this policy assumes may change.

Using the Sand gateway may conflict with xAI's terms or Acceptable Use Policy. That is a product and account risk for the Bot owner, not a vulnerability in this repo. See the [Legal](README.md#legal) section in the README.
