# Connect your own AI provider

Pocket AI needs an accessible OpenAI-compatible provider. Paste its base URL (for example `https://api.example.com/v1`) in **API Endpoint** and its optional key in the native **API Key** password field, without `Bearer`. Models are discovered automatically.

The default localhost URL expects a separately running VS Code Copilot bridge. That bridge and provider access are not included. `127.0.0.1` means this computer.

For Hermes/OpenClaw, open **Remote Agents**, choose the backend/server, then use its credential action. Only Ask AI uses remote agents.

The extension is free; your provider's charges and access requirements still apply. [Read the setup guides](https://edliuustc.github.io/pocket-ai-raycast/guides.html).
