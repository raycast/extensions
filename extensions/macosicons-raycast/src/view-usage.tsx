import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getApiKey,
  generateApiKey,
  setApiKey,
  getApiUsage,
  oauthClient,
  signOut,
  ApiUsageResponse,
} from "./api";
import SignIn from "./sign-in";

function progressBar(value: number, max: number, width = 20): string {
  if (max <= 0) return "─".repeat(width);
  const filled = Math.round((Math.min(value, max) / max) * width);
  const pct = Math.round((value / max) * 100);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${pct}%`;
}

function buildMarkdown(
  apiKey: string | undefined,
  usage: ApiUsageResponse | null,
): string {
  if (!apiKey) return `# Loading…`;

  let md = `# API Key\n\n\`\`\`\n${apiKey}\n\`\`\`\n`;

  if (!usage) return md;

  const limit = usage.apiCallLimit ?? 0;

  md += `\n---\n\n## Usage\n\n`;

  if (usage.dailyUsage != null && limit > 0) {
    md += `**Today**\n\n`;
    md += `\`${progressBar(usage.dailyUsage, limit)}\`  ${usage.dailyUsage.toLocaleString()} / ${limit.toLocaleString()}\n\n`;
  }

  if (usage.currentMonthlyUsage != null && limit > 0) {
    md += `**This month**\n\n`;
    md += `\`${progressBar(usage.currentMonthlyUsage, limit)}\`  ${usage.currentMonthlyUsage.toLocaleString()} / ${limit.toLocaleString()}\n\n`;
  }

  if (usage.totalUsage != null) {
    md += `**All time:** ${usage.totalUsage.toLocaleString()} requests\n`;
  }

  md += `\n---\n\n[Purchase more monthly usage](https://docs.macosicons.com)\n`;

  return md;
}

export default function ViewApiKeyCommand() {
  const [apiKey, setApiKeyState] = useState<string | undefined | null>(null);
  const [usage, setUsage] = useState<ApiUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const key = await getApiKey();
      setApiKeyState(key ?? undefined);

      if (key) {
        try {
          const usageData = await getApiUsage(key);
          setUsage(usageData);
        } catch {
          // No usage data available — silently skip
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerateKey() {
    const tokenSet = await oauthClient.getTokens();
    const sessionToken = tokenSet?.accessToken;
    if (!sessionToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not signed in",
        message: "Please sign in again to regenerate your API key.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateApiKey(sessionToken);
      await setApiKey(result.apiKey);
      setApiKeyState(result.apiKey);
      await showToast({
        style: Toast.Style.Success,
        title: "API key refreshed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate API key",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await signOut();
      setApiKeyState(undefined);
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!isLoading && apiKey === undefined) {
    return <SignIn onSignIn={(key) => setApiKeyState(key)} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(apiKey ?? undefined, usage)}
      actions={
        <ActionPanel>
          {apiKey && (
            <Action.CopyToClipboard title="Copy API Key" content={apiKey} />
          )}
          <Action title="Refresh API Key" onAction={handleRegenerateKey} />
          <Action title="Reload Usage" onAction={loadData} />
          <Action
            title="Sign out"
            onAction={handleSignOut}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    />
  );
}
