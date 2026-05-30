# Panicly Requests

Monitor Panicly gateway traffic from Raycast.

## Setup

1. Sign in to Panicly in your browser.
2. Open your browser developer tools and copy the `panicly_session` cookie for your Panicly app URL.
3. Open Raycast Preferences, select Panicly Requests, and paste either the full `panicly_session=...` cookie or just its value into Session Cookie.
4. Keep Panicly Base URL as `https://panicly.vercel.app`, or change it if you run Panicly from another deployment.

## Commands

### View Requests

Shows recent Panicly request logs, including:

- allowed and blocked decisions
- project, route, provider, model, sender IP, tokens, and cost estimate
- request detail with raw saved event data
- actions to open the request in Panicly or copy the request ID, URL, or JSON

The command reads the same authenticated dashboard API used by the Panicly web app. If the session expires, paste a fresh `panicly_session` cookie in preferences.
