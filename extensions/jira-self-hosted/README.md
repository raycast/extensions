# Jira (Self-Hosted)

Create, access and modify issues and sprints. Supports **Jira Server and Data Center 9.0+** only; Jira 8.x is not supported.

## Setup

1. Open any command from the Jira extension, then press `⌘` + `K` → **Configure Extension**.
2. Fill in the required fields:
   - **Jira Base URL** — full URL including the context path if used, e.g. `https://jira.company.com` or `https://company.com/jira`.
   - **Username** — your Jira login name.
   - **Password / API Token** — your Jira password, or a Personal Access Token if your instance supports it.
   - **Auth Type** — choose **Basic** (username + password/token encoded as Base64) or **Bearer** (Personal Access Token; supported on Jira Data Center 9+).

## Optional Settings

- **Trust self-signed SSL certificates** — enable if your Jira instance uses a self-signed certificate. Not recommended for production environments.

## Notes

- This extension targets **Jira Server / Data Center only**. Jira Cloud (`*.atlassian.net`) is not supported.
- User identities use the Jira **username** (`name` field), not `accountId`.
- The minimum supported Jira version is **9.0**. Use **Basic** (username and password or API token) or **Bearer** with a Personal Access Token where your admin allows it.
