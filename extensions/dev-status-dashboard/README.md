# Dev Status Dashboard

Check the status of the dev services you rely on — GitHub, OpenAI, Cloudflare, Vercel and more — from a single dashboard and the macOS menu bar. No API keys, no accounts: it works the moment you install it, using each service's public status API.

## Commands

- **Dashboard** — a live list of your services with their current status, active incidents, and last update. Open a service to see the full incident detail: impact, current stage, affected components, and the update timeline.
- **Status Menu Bar** — keeps an at-a-glance indicator in your menu bar and refreshes in the background.

## Features

- **Zero-config catalog** — popular dev services are built in and enabled on first launch. Add or remove any of them, reorder with Move Up / Move Down, and mark favorites.
- **Filter & sort** — show everything, incidents only, or favorites only; sort by your custom order, name, status, or active incidents.
- **Incident detail** — current status, impact, start time, current stage, affected components, and the full Investigating → Identified → Monitoring → Resolved history.
- **Menu bar display modes** — icon only, problem count, worst-affected service name, or an operational/total summary. The refresh interval is configurable in the command settings.
- **Shared 5-minute cache** — the dashboard and menu bar reuse recent results, so opening one right after the other is instant. Refresh (⌘R) forces a fresh fetch.

## Supported services

OpenAI, Anthropic, Moonshot AI (Kimi), GitHub, Cloudflare, Vercel, Netlify, Render, Fly.io, Railway, Google Cloud, AWS, Supabase, PlanetScale, MongoDB Atlas, Sentry, Datadog, Discord, Slack, Twilio, SendGrid, Resend.

Most of these expose a public [Statuspage](https://www.atlassian.com/software/statuspage) v2 API. Slack, Google Cloud, and AWS publish their own formats and are handled by dedicated providers (Google Cloud's feed also carries Gemini / Vertex AI incidents). Services on other backends (GitLab, Stripe, Neon) still need providers and are planned for a follow-up.

## Data & privacy

The extension only makes unauthenticated `GET` requests to each service's public status endpoint (e.g. `https://www.githubstatus.com/api/v2/summary.json`). Nothing is sent anywhere else, and no credentials are required or stored.
