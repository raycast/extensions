import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  getApiKey,
  authorizeWithOAuth,
  getApiUsage,
  signOut,
  isUsingPreferenceKey,
  ApiUsage,
  FREE_TIER,
} from "./api";

function progressBar(value: number, max: number, width = 20): string {
  if (max <= 0) return "─".repeat(width);
  const ratio = Math.min(value, max) / max;
  const filled = Math.round(ratio * width);
  const pct = Math.round((value / max) * 100);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${pct}%`;
}

function maskKey(apiKey: string): string {
  return apiKey.length > 8
    ? `${apiKey.slice(0, 4)}${"•".repeat(apiKey.length - 8)}${apiKey.slice(-4)}`
    : "••••••••";
}

function buildSignedInMarkdown(apiKey: string, usage: ApiUsage | null): string {
  let md = `# macOSicons API\n\n**API Key**\n\n\`\`\`\n${maskKey(apiKey)}\n\`\`\`\n`;

  if (usage) {
    const limit = usage.apiCallLimit || FREE_TIER.monthlyLimit;
    const remaining = Math.max(limit - usage.currentMonthlyUsage, 0);
    md += `\n---\n\n## Usage\n\n`;
    md += `**This month**\n\n`;
    md += `\`${progressBar(usage.currentMonthlyUsage, limit)}\`  ${usage.currentMonthlyUsage.toLocaleString()} / ${limit.toLocaleString()} requests\n\n`;
    md += `${remaining.toLocaleString()} requests remaining this month.\n\n`;
    md += `**All time:** ${usage.totalUsage.toLocaleString()} requests\n`;

    if (remaining === 0) {
      md += `\n> ⚠️ You've hit this month's limit. Requests will resume next month, or upgrade for a higher limit.\n`;
    }
  }

  md += `\n---\n\n## About the free tier\n\n`;
  md += `This extension is powered by the **macOSicons.com API**. The free tier includes:\n\n`;
  md += `- **${FREE_TIER.monthlyLimit} requests / month** (each search counts as one request)\n`;
  md += `- **${FREE_TIER.requestsPerSecond} requests / second**\n\n`;
  md += `Need more? Upgrading raises your limits **and** directly supports the ongoing development of macOSicons — a free, open library of community-made icons.\n\n`;
  md += `[Upgrade & learn more →](${FREE_TIER.docsUrl})\n`;

  return md;
}

function buildSignedOutMarkdown(): string {
  return (
    `# macOSicons API\n\n` +
    `You're not signed in yet.\n\n` +
    `Sign in with your macOSicons.com account to get a **free API key** and start applying icons from Raycast.\n\n` +
    `The free tier includes **${FREE_TIER.monthlyLimit} requests/month** and **${FREE_TIER.requestsPerSecond} requests/second**.\n`
  );
}

export default function ViewApiKeyCommand() {
  const [apiKey, setApiKey] = useState<string | undefined | null>(null); // null = loading
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const usingPreferenceKey = isUsingPreferenceKey();

  const loadUsage = useCallback(async (key: string) => {
    try {
      setUsage(await getApiUsage(key));
    } catch {
      // No usage data available — silently skip.
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const key = await getApiKey();
      setApiKey(key ?? undefined);
      if (key) await loadUsage(key);
    } catch {
      setApiKey(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [loadUsage]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      const key = await authorizeWithOAuth();
      setApiKey(key);
      await loadUsage(key);
    } catch (error) {
      setApiKey(undefined);
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign in failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      // Local credentials are cleared either way, but the remote session may
      // still be live — say so rather than claiming a clean sign-out.
      await showToast({
        style: Toast.Style.Failure,
        title: "Signed out on this device only",
        message:
          error instanceof Error
            ? error.message
            : "The session may still be active on macosicons.com.",
      });
    } finally {
      setApiKey(undefined);
      setUsage(null);
      setIsLoading(false);
    }
  }

  const signedIn = typeof apiKey === "string";
  const markdown = signedIn
    ? buildSignedInMarkdown(apiKey, usage)
    : buildSignedOutMarkdown();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {signedIn && (
            <Action.CopyToClipboard
              title="Copy API Key"
              icon={Icon.Key}
              content={apiKey}
            />
          )}
          {!signedIn && !usingPreferenceKey && (
            <Action
              title="Sign in with Macosicons.com"
              icon={Icon.Globe}
              onAction={handleSignIn}
            />
          )}
          {signedIn && (
            <Action icon={Icon.Repeat} title="Refresh Usage" onAction={load} />
          )}
          <Action.OpenInBrowser
            title="Upgrade & Learn More"
            icon={Icon.Stars}
            url={FREE_TIER.docsUrl}
          />
          {signedIn && !usingPreferenceKey && (
            <Action
              title="Sign out"
              icon={Icon.Logout}
              onAction={handleSignOut}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
