# Weather Extension (Apple WeatherKit)

A secure Raycast extension to check weather using the Apple WeatherKit API.

## Architecture

This extension uses a **Secure Proxy Architecture** to protect sensitive Apple Developer credentials. Instead of bundling your private `.p8` key in the extension, the extension fetches data through a private Cloudflare Worker proxy.

## Setup Instructions

### 1. Deploy the Proxy (Backend)
The proxy ensures your `.p8` key remains hidden from the public.

1.  Go to the `proxy/` directory.
2.  Run `npx wrangler login` to authenticate with Cloudflare.
3.  Run `npm run deploy` to publish the proxy.
4.  Set your secrets in Cloudflare:
    ```bash
    npx wrangler secret put APPLE_TEAM_ID
    npx wrangler secret put APPLE_KEY_ID
    npx wrangler secret put APPLE_SERVICE_ID
    npx wrangler secret put APPLE_PRIVATE_KEY
    ```
5.  Copy the **Worker URL** provided by Cloudflare (e.g., `https://weather-proxy.yourname.workers.dev`).

### 2. Configure the Extension (Raycast)
1.  Open Raycast and go to the Weather extension preferences.
2.  Set your default location and temperature unit if needed.

The extension is zero-config for end users. The proxy URL is baked into the extension code, so there is no "Proxy URL" preference to fill in.

## Features
- [x] Current weather display.
- [x] Secure API key handling via Proxy.
- [x] 10-hour hourly forecast.
- [x] 7-day daily forecast.
- [x] Location search and coordinate support.
- [x] Weather alerts.
