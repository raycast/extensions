# Changelog

## [0.1.1] - 2026-08-21

- Status uses `GET /v1/models` as the primary liveness check (OpenAI-compatible). `/health` is optional metadata.
- Empty Model Name uses a model advertised by `/v1/models` instead of always sending `hermes-agent`.
- API Token is no longer a required preference field so commands can load; the bearer is still sent when set.

## [Initial Release] - 2026-05-05

- Initial release
- Ask Hermes: Quick question and answer
- API Server Status: Check Hermes API server connection status
- Open Webchat: Open Hermes dashboard in browser (auto-starts if not running)
