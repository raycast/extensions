# Amp Code Threads

Search and open your Amp Code threads directly from Raycast.

## Setup

This extension requires your Amp Code session token to authenticate API requests.

### How to Get Your Session Token

1. Open [ampcode.com](https://ampcode.com) in your browser and sign in
2. Open Developer Tools (`F12` or `Cmd+Option+I`)
3. Go to the **Application** tab
4. In the sidebar, expand **Cookies** and select `https://ampcode.com`
5. Find the cookie named `session` and copy its **Value**
6. Paste this value into the extension preferences when prompted

## Features

- Browse your Amp Code threads with infinite scroll
- Search threads by title
- Copy the CLI command to continue a thread (`amp threads continue <id>`)
- Open threads directly in your browser
