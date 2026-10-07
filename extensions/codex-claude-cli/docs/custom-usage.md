# custom providers

Write quota observations to a local JSON file, then select it in **Custom Usage File** in PromptCast's settings. Refresh reads the latest saved observation alongside Claude and Codex.

```json
{
  "version": 1,
  "providers": [
    {
      "id": "my-provider",
      "name": "My Provider",
      "plan": "Pro",
      "updatedAt": "2026-10-07T12:00:00Z",
      "dashboardUrl": "https://example.com/usage",
      "windows": [
        {
          "label": "Session",
          "usedPercent": 28,
          "resetAt": "2026-10-07T15:00:00Z"
        }
      ]
    }
  ]
}
```

Replace the example values with your provider's measurements. Update `updatedAt` when you observe usage; refreshing Raycast keeps that timestamp intact. Observations older than five minutes or past a reported reset are marked stale and excluded from the menu-bar total.

- `name`, `updatedAt`, and `windows` are required. `id`, `plan`, and `dashboardUrl` are optional.
- Keep `id` unique and stable across updates. Without one, `name` identifies the provider.
- Each window needs a `label` and numeric `usedPercent` between 0 and 100. Omit unavailable windows instead of reporting zero. `resetAt` is optional.
- Timestamps use ISO 8601 with a timezone. Dashboard links use HTTPS without embedded credentials.
- A file supports 30 providers, 20 windows per provider, and up to 1 MiB. Invalid providers appear separately without hiding valid ones.

Have your producer write a temporary file and rename it into place so refresh never reads a partial update.
