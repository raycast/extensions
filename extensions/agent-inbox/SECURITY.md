# Security

**English** | [简体中文](SECURITY.zh-CN.md)

This extension reads local agent conversations and window information and maintains a local database, cache, and notifications. Do not put credentials, complete conversations, databases, or unredacted configuration in public issues, pull requests, or screenshots.

## Reporting a vulnerability

Follow the [Raycast extensions security policy](https://github.com/raycast/extensions/blob/main/SECURITY.md). Report vulnerabilities privately to **security@raycast.com** with the subject **[Extension Security] Agent Inbox**. Include the affected version, reproduction conditions, impact, and a redacted sample. Do not disclose vulnerability details in public issues or pull requests.

## Isolating test data

When debugging the state machine or CLI, use a temporary `AGENT_INBOX_HOME` with `notifications: false`. See the [CLI example](docs/cli.md). Do not use real sessions to test automatic approvals or message sending; Agent Inbox does not approve agent requests on your behalf.

There is no published GitHub Release or long-term support branch yet. Include the commit in your report; release notes will describe the scope of fixes.
