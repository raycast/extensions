import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { getPreferences, validatePreferences } from "./lib/preferences";

export default function Command() {
  const prefs = getPreferences();
  const validation = validatePreferences();

  const markdown = `
# Evolution API Settings

## Current Configuration

**Base URL:** \`${prefs.baseUrl || "Not configured"}\`

**API Key:** ${prefs.apiKey ? "✅ Configured" : "❌ Not configured"}

## Status

${
  validation.isValid
    ? "✅ **All settings are valid**"
    : `❌ **Configuration Error**

${validation.error}`
}

## Quick Start

1. Make sure Evolution API is running:
\`\`\`bash
docker run -d \\
  --name evolution_api \\
  -p 8080:8080 \\
  -e AUTHENTICATION_API_KEY=your-secret-key \\
  atendai/evolution-api:latest
\`\`\`

2. Configure this extension:
   - **Base URL**: http://localhost:8080 (or your server URL)
   - **API Key**: The value you set in AUTHENTICATION_API_KEY

3. Test the connection by creating an instance or managing instances

## Documentation

- [Evolution API Docs](https://doc.evolution-api.com/v1/en/get-started/introduction)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Evolution API Settings"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={validation.isValid ? "Ready" : "Needs Configuration"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Base URL"
            text={prefs.baseUrl || "Not set"}
            icon={prefs.baseUrl ? Icon.CheckCircle : Icon.XMarkCircle}
          />
          <Detail.Metadata.Label
            title="API Key"
            text={prefs.apiKey ? "Configured" : "Not set"}
            icon={prefs.apiKey ? Icon.CheckCircle : Icon.XMarkCircle}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Documentation"
            text="Evolution API Docs"
            target="https://doc.evolution-api.com/v1/en/get-started/introduction"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Settings"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
          <Action.OpenInBrowser
            title="Open Evolution API Docs"
            url="https://doc.evolution-api.com/v1/en/get-started/introduction"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.OpenInBrowser
            title="Open Swagger UI"
            url={`${prefs.baseUrl || "http://localhost:8080"}/docs`}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.OpenInBrowser
            title="Open Manager UI"
            url={`${prefs.baseUrl || "http://localhost:8080"}/manager`}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    />
  );
}
