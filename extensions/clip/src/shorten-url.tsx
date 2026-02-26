import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showHUD,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { services } from "./services/registry";
import { shortenUrl } from "./services/shorten";
import { addToHistory } from "./storage/history";
import { ShorteningService } from "./types";

function getApiKey(
  service: ShorteningService,
  prefs: Preferences.ShortenUrl,
): string | undefined {
  if (!service.requiresApiKey || !service.apiKeyPreferenceName)
    return undefined;
  return prefs[service.apiKeyPreferenceName as keyof Preferences.ShortenUrl];
}

function isServiceConfigured(
  service: ShorteningService,
  prefs: Preferences.ShortenUrl,
): boolean {
  if (!service.requiresApiKey) return true;
  const key = getApiKey(service, prefs);
  return !!key && key.trim().length > 0;
}

export default function ShortenUrl() {
  const [url, setUrl] = useState<string>("");
  const [clipboardUrl, setClipboardUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const prefs = getPreferenceValues<Preferences.ShortenUrl>();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && text.trim().startsWith("http")) {
        setClipboardUrl(text.trim());
      }
      setIsLoading(false);
    });
  }, []);

  const activeUrl = url.trim() || clipboardUrl;

  async function handleShorten(service: ShorteningService) {
    if (!isServiceConfigured(service, prefs)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key required",
        message: `Configure your ${service.name} API key in preferences`,
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Shortening URL...",
    });

    try {
      const apiKey = getApiKey(service, prefs);
      const result = await shortenUrl(service.id, activeUrl, apiKey);

      await Clipboard.copy(result.shortUrl);
      await addToHistory(result);

      toast.style = Toast.Style.Success;
      toast.title = "URL shortened";
      toast.message = result.shortUrl;

      await showHUD(`Copied: ${result.shortUrl}`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to shorten URL";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  if (!isLoading && !activeUrl) {
    return (
      <List
        searchBarPlaceholder="Enter or paste a URL to shorten"
        onSearchTextChange={setUrl}
      >
        <List.EmptyView
          icon={Icon.Link}
          title="No URL found"
          description="Copy a URL to clipboard or type one above"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter or paste a URL to shorten"
      onSearchTextChange={setUrl}
    >
      {services.map((service) => {
        const configured = isServiceConfigured(service, prefs);

        return (
          <List.Item
            key={service.id}
            title={service.name}
            icon={service.icon}
            accessories={
              !configured
                ? [
                    {
                      tag: {
                        value: "API key required",
                        color: Color.SecondaryText,
                      },
                    },
                  ]
                : undefined
            }
            actions={
              <ActionPanel>
                {configured ? (
                  <Action
                    title={`Shorten with ${service.name}`}
                    icon={Icon.Link}
                    onAction={() => handleShorten(service)}
                  />
                ) : (
                  <Action
                    title="Configure Api Key"
                    icon={Icon.Gear}
                    onAction={() => openExtensionPreferences()}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
