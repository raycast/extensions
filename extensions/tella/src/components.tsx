import React from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { RateLimitError } from "./api";

export function MissingApiKeyDetail() {
  return (
    <Detail
      markdown={`# Welcome to Tella for Raycast

To get started, you need to connect your Tella account.

## Setup Instructions

1. **Get your API key** from [Tella Account Settings](https://www.tella.tv/account)
2. Click **Open Extension Preferences** below (or press Enter)
3. Paste your API key and save

That's it! You'll be able to browse videos, search transcripts, and manage playlists.

## Need help?

- [Tella Help Center](https://help.tella.tv)
- [Tella Website](https://www.tella.tv)`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Open Tella Account Settings"
            url="https://www.tella.tv/account"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

export function ErrorDetail({
  error,
  context,
}: {
  error: Error | string;
  context?: Record<string, unknown>;
}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const debugInfo = {
    error: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    ...context,
  };
  const debugText = JSON.stringify(debugInfo, null, 2);

  return (
    <Detail
      markdown={`# Error\n\n${errorMessage}\n\n## Debug Info\n\n\`\`\`json\n${debugText}\n\`\`\`\n\nPress **Enter** to copy debug info.`}
      actions={
        <ActionPanel>
          <Action
            title="Copy Debug Info"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(debugText);
              showToast({
                style: Toast.Style.Success,
                title: "Debug info copied",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function RateLimitErrorDetail({
  error,
  onRetry,
}: {
  error: RateLimitError;
  onRetry: () => void;
}) {
  const retryAfter = error.retryAfter || 60; // Default to 60 seconds if not specified
  const waitTime =
    retryAfter > 60
      ? `${Math.floor(retryAfter / 60)} minute${Math.floor(retryAfter / 60) > 1 ? "s" : ""}`
      : `${retryAfter} second${retryAfter > 1 ? "s" : ""}`;

  const handleRetry = async () => {
    showToast({
      style: Toast.Style.Animated,
      title: "Waiting for rate limit...",
      message: `Retrying in ${waitTime}...`,
    });

    // Wait for the retry-after period plus a small buffer
    await new Promise((resolve) =>
      setTimeout(resolve, (retryAfter + 2) * 1000),
    );

    showToast({
      style: Toast.Style.Success,
      title: "Retrying...",
    });

    onRetry();
  };

  return (
    <Detail
      markdown={`# Rate Limit Exceeded\n\n${error.message}\n\n## What happened?\n\nThe Tella API has temporarily limited requests from your account. This usually happens when making too many requests in a short period.\n\n## What to do?\n\n- **Wait and retry**: The extension will automatically retry after ${waitTime}.\n- **Use the Retry action**: Press **Enter** or use the Retry action below to wait and retry automatically.\n- **Try again later**: If the issue persists, wait a few minutes before trying again.\n\n## Tips\n\n- Use the cache duration setting to reduce API calls\n- Avoid rapid refreshing (\`⌘R\`)\n- The extension caches data to minimize API requests`}
      actions={
        <ActionPanel>
          <Action
            title={`Retry After ${waitTime}`}
            icon={Icon.ArrowClockwise}
            onAction={handleRetry}
            shortcut={{ modifiers: [], key: "enter" }}
          />
          <Action
            title="Retry Now"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser
            title="Open Tella Dashboard"
            url="https://www.tella.tv"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
