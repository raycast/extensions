# Linkonda

Shorten the URL on your clipboard with [Linkonda](https://linkonda.com), a privacy-friendly URL shortener.

Copy a web address and run **Shorten Clipboard URL**. The command copies the short link to your clipboard, in place of the address, and shows the link's QR code, made on your computer.

## Without an account

Leave the API key empty, and links are made as on linkonda.com when you're signed out. They expire, and the command shows when.

## With an API key

Create an API key at https://linkonda.com/api-keys (API keys need a paid plan) and paste it into the extension's preferences. Your links are then saved to your account.

## What the extension sends

The command reads your clipboard when you run it. If the clipboard holds a single web address, the command sends that address to the Linkonda API at api.linkonda.com and nowhere else, with your API key if you set one. Otherwise it sends nothing. It then copies the short link to your clipboard, where Raycast's clipboard history can keep it. The extension itself stores nothing else; the Raycast app keeps the API key you enter in its preferences.

Privacy policy: https://linkonda.com/privacy
