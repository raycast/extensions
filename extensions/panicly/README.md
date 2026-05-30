# Panicly Requests

Monitor Panicly gateway traffic from Raycast.

## Setup

1. Open Panicly Settings.
2. Generate or copy a project API key.
3. Paste that key into the Panicly API Key preference in Raycast.

The Panicly Base URL defaults to `https://panicly.lol`. You only need to change it for another deployment.

## Commands

### View Requests

Shows recent Panicly request logs, including:

- allowed and blocked decisions
- project, route, provider, model, sender IP, tokens, and cost estimate
- request detail with raw saved event data
- actions to open the request in Panicly or copy the request ID, URL, or JSON

The command uses the project API key to read recent request data for that project. It requires a paid Panicly workspace plan and does not require browser cookies or developer tools.
