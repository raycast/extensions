# App Freezer Agent Protocol v4

`appfreezerctl list --json` refreshes the native Agent and returns one JSON object:

```json
{
  "protocolVersion": 4,
  "generatedAt": "2026-07-30T12:00:00Z",
  "applications": [
    {
      "id": "opaque-process-identity",
      "name": "Example",
      "bundleIdentifier": "com.example.app",
      "bundlePath": "/Applications/Example.app",
      "cpuPercent": 8.4,
      "memoryPercent": 3.4,
      "status": "running",
      "canPause": true,
      "canQuit": true
    }
  ],
  "lastAction": {
    "requestID": "uuid",
    "status": "succeeded"
  }
}
```

Actions use the `appfreezer://` URL scheme: `appfreezer://pause`, `appfreezer://resume`, `appfreezer://resume-all`, `appfreezer://quit`, `appfreezer://force-quit`, and `appfreezer://settings`. Protocol v4 and Force Quit require App Freezer 0.1.0 or newer. Quit resumes a paused application before asking it to terminate normally. Force Quit requires explicit Raycast confirmation and an opaque process identity. After sending an action, the extension calls `appfreezerctl wait --request-id UUID --json` so checking the result cannot overwrite it with a new refresh request. Protocol v4 stores one `lastAction`, so the extension serializes refreshes and actions. Opaque application IDs expire when the underlying process identity changes.
