# Security policy

Do not put credentials, tokens, AWS account metadata, company URLs, or diagnostic screenshots in public issues.

Report a vulnerability through [GitHub private vulnerability reporting](https://github.com/burger66leo/raycast-aws-sso-status/security/advisories/new). Include reproduction steps using fictional configuration and a fake CLI whenever possible.

The extension passes authentication and refresh to the installed AWS CLI. It never logs raw CLI output, persists credential values, or sends AWS data to the author. Its local cache stores only status/profile metadata and retry/reminder state. See [Usage & limitations](docs/GUIDE.md) for the security model.
