# Security

## Data handling

Linear Command Center talks directly to `https://api.linear.app/graphql`. It has no custom backend, telemetry, analytics, or local file storage.

Raycast's OAuth utilities create and store the credentials. The extension reads the access token only to make a Linear request and never logs or stores it.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not put access tokens, private issue content, or other workspace data in a public issue.
