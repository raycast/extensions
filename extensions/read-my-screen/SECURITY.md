# Security

## Reporting a vulnerability

If you believe you have found a **security bug in this extension’s code** (for example, unsafe handling of user input, unintended data exfiltration, or a dependency issue worth coordinating), please **open a private security advisory** on GitHub if available, or open an issue labeled `security` with details so maintainers can respond.

Please **do not** paste real API keys, screenshots of secrets, or personal data in public issues.

## How this extension handles sensitive data

| Topic             | Behavior                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| API keys          | Stored only in Raycast extension preferences (local). Never embedded in source code.      |
| Analysis content  | Sent only to the AI provider you select (OpenAI, Anthropic, or Google APIs).              |
| History / presets | Stored locally via Raycast; screen thumbnails live under the extension support directory. |

This project does **not** operate a custom server for your requests. You are responsible for provider accounts, API usage, and compliance with your organization’s policies.

## Supply chain

Dependencies are pinned in `package-lock.json`. Run `npm audit` periodically and update dependencies for security patches.
