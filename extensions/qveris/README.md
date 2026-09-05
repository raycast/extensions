# QVeris for Raycast

Discover, inspect, validate, and run capabilities from the QVeris network without leaving Raycast.

## Setup

1. Create a QVeris API key in the [Global account portal](https://qveris.ai/account?page=api-keys) or the [China account portal](https://qveris.cn/account?page=api-keys).
2. Open the extension preferences in Raycast.
3. Paste the API key into **QVeris API Key** and choose the matching **API Region**.

The API key is stored as a Raycast password preference and is sent only to the selected QVeris API endpoint for authentication.

## Commands

### Discover Capabilities

Describe a task in natural language to find ranked capabilities. Open a result to review its current parameters, provider, reliability, latency, and available pricing information.

You can copy a capability ID or choose **Run Capability…**. Before execution, the extension validates the JSON parameters and requests a free quote. It then asks for confirmation because a capability call may consume QVeris credits or cause side effects in a third-party service.

## Raycast AI Tools

Raycast Pro users can mention `@qveris` in AI Chat. The extension provides four tools:

- **Discover Capabilities** — find capabilities for a task.
- **Inspect Capability** — retrieve the current schema and pricing metadata.
- **Probe Capability** — validate parameters and get a free quote without execution.
- **Call Capability** — execute a selected capability after validation and explicit confirmation.

For reliable calls, follow the sequence Discover → Inspect → Probe → Call and preserve the returned `tool_id` and `search_id` values exactly.

## Billing and Privacy

Discover, Inspect, and Probe are free. Call pricing depends on the selected capability and is shown when QVeris returns a quote. Final billing information is available in your QVeris account.

Search queries, capability parameters, and execution data are sent to the selected QVeris API endpoint to perform the requested operation. The extension includes no external analytics.

Learn more in the [QVeris documentation](https://qveris.ai/docs).
