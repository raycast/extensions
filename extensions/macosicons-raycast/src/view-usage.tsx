import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
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

function buildSignedInMarkdown(
  apiKey: string,
  usage: ApiUsage | undefined,
  usageError: Error | undefined,
): string {
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
  } else if (usageError) {
    md += `\n---\n\n## Usage\n\nCould not load usage data. ${usageError.message}\n`;
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const usingPreferenceKey = isUsingPreferenceKey();

  const {
    data: apiKey,
    isLoading: isLoadingKey,
    revalidate: revalidateApiKey,
  } = useCachedPromise(getApiKey);

  const {
    data: usage,
    isLoading: isLoadingUsage,
    error: usageError,
    revalidate: revalidateUsage,
  } = useCachedPromise((key: string) => getApiUsage(key), [apiKey ?? ""], {
    execute: typeof apiKey === "string",
    keepPreviousData: true,
  });

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await authorizeWithOAuth();
      await revalidateApiKey();
    } catch (error) {
      await showFailureToast(error, { title: "Sign In Failed" });
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    const confirmed = await confirmAlert({
      title: "Sign Out of macOSicons?",
      message: "You'll need to sign in again to search and apply icons.",
      primaryAction: {
        title: "Sign out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await signOut();
    } catch (error) {
      await showFailureToast(error, {
        title: "Signed Out on This Device Only",
      });
    } finally {
      await revalidateApiKey();
    }
  }

  const signedIn = typeof apiKey === "string";
  const markdown = signedIn
    ? buildSignedInMarkdown(
        apiKey,
        usage,
        usageError instanceof Error ? usageError : undefined,
      )
    : buildSignedOutMarkdown();

  return (
    <Detail
      isLoading={
        isSigningIn ||
        isLoadingKey ||
        (signedIn && isLoadingUsage && usage === undefined)
      }
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
              title="Sign in with MacOSicons.com"
              icon={Icon.Person}
              onAction={handleSignIn}
            />
          )}
          {signedIn && (
            <Action
              icon={Icon.Repeat}
              title="Refresh Usage"
              onAction={revalidateUsage}
            />
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
