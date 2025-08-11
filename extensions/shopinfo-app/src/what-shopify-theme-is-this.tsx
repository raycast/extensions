import {
  getFrontmostApplication,
  showToast,
  Toast,
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { getBrowserURL } from "./utils";
import { useState, useEffect } from "react";
import { Preferences, ShopifyThemeInfo } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [themeInfo, setThemeInfo] = useState<ShopifyThemeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentURL, setCurrentURL] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    fetchThemeInfo(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchThemeInfo = async (signal?: AbortSignal) => {
    try {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.apiKey) {
        setError(
          "API key is not configured. Please set it in extension preferences. If you do not have a key, contact taylor@thepagesmedia.com to request.",
        );
        setIsLoading(false);
        return;
      }

      await showToast({
        title: "Getting browser URL...",
        style: Toast.Style.Animated,
      });

      const frontmostApp = await getFrontmostApplication();
      const url = await getBrowserURL(frontmostApp.name);

      if (!url) {
        setError("No website open in browser. Please open a Shopify store and try again.");
        setIsLoading(false);
        await showToast({
          title: "No website open",
          style: Toast.Style.Failure,
        });
        return;
      }

      setCurrentURL(url);

      await showToast({
        title: "Checking theme information...",
        style: Toast.Style.Animated,
      });

      const apiEndpoint = preferences.apiEndpoint || "https://shopinfo.app/api/v1/themes";
      const requestUrl = `${apiEndpoint}/shop_check`;
      const requestBody = { shop_url: url };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API-KEY": `${preferences.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your credentials.");
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.theme) {
        const themeData: ShopifyThemeInfo = {
          theme_name: data.theme.name,
          theme_version: data.theme.installed_version,
          theme_vendor: data.theme.developer,
          theme_id: data.theme.id?.toString(),
          store_url: data.shop_url,
          update_available: data.theme.update_available,
          latest_version: data.theme.latest_version,
          detection_method: data.detection_method,
          checked_at: data.checked_at,
          details_url: data.theme.details_url,
          documentation_url: data.theme.documentation_url,
        };
        setError(null);
        setThemeInfo(themeData);
        await showToast({
          title: "Theme information retrieved",
          style: Toast.Style.Success,
        });
      } else {
        throw new Error(data.error || "No theme information found");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("Error fetching theme info:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      await showFailureToast(err, { title: "Could not fetch theme info" });
    } finally {
      setIsLoading(false);
    }
  };

  const getMarkdownContent = () => {
    if (error) {
      return `# Error\n\n${error}`;
    }

    if (isLoading) {
      return `# Analyzing Shopify Theme...

🔍 Please wait while we identify the theme for this store.

## Status
- ✅ Connecting to shopinfo.app
- ⏳ Analyzing theme information...

This usually takes just a few seconds.`;
    }

    if (!themeInfo) {
      return `# No Theme Information Available

Unable to detect theme information for this store. This could happen if:
- The site is not a Shopify store
- The theme information is not accessible
- There was a network issue

Try refreshing or visit a different Shopify store.`;
    }

    const markdown = `# ${themeInfo.theme_name || "Unknown Theme"}

${themeInfo.theme_vendor ? `**Theme Dev:** ${themeInfo.theme_vendor}\n` : ""}
${themeInfo.theme_version ? `**Current Version:** ${themeInfo.theme_version}\n` : ""}
${themeInfo.latest_version ? `**Latest Version:** ${themeInfo.latest_version}\n` : ""}
${themeInfo.update_available ? `⚠️ **Update Available**\n` : ""}

## Store Information
${currentURL ? `**Checked URL:** ${currentURL}\n` : ""}
${themeInfo.detection_method ? `**Detection Method:** ${themeInfo.detection_method}\n` : ""}
${themeInfo.checked_at ? `**Checked At:** ${new Date(themeInfo.checked_at).toLocaleString()}\n` : ""}
`;

    return markdown;
  };

  const getMetadataItems = () => {
    if (isLoading || !themeInfo) return null;

    return (
      <Detail.Metadata>
        {themeInfo.theme_name && <Detail.Metadata.Label title="Theme Name" text={themeInfo.theme_name} />}
        {themeInfo.theme_vendor && <Detail.Metadata.Label title="Theme Vendor" text={themeInfo.theme_vendor} />}
        {themeInfo.theme_version && <Detail.Metadata.Label title="Current Version" text={themeInfo.theme_version} />}
        {themeInfo.latest_version && <Detail.Metadata.Label title="Latest Version" text={themeInfo.latest_version} />}
        {themeInfo.update_available !== undefined && (
          <Detail.Metadata.Label
            title="Update Status"
            text={themeInfo.update_available ? "Update Available" : "Up to Date"}
            icon={themeInfo.update_available ? Icon.ExclamationMark : Icon.Check}
          />
        )}
        {themeInfo.theme_id && <Detail.Metadata.Label title="Theme ID" text={themeInfo.theme_id} />}
        <Detail.Metadata.Separator />
        {themeInfo.store_url && <Detail.Metadata.Label title="Shop URL" text={themeInfo.store_url} />}
        {themeInfo.detection_method && (
          <Detail.Metadata.Label title="Detection Method" text={themeInfo.detection_method} />
        )}
        {themeInfo.checked_at && (
          <Detail.Metadata.Label title="Last Checked" text={new Date(themeInfo.checked_at).toLocaleString()} />
        )}
      </Detail.Metadata>
    );
  };

  const getActions = () => {
    const actions = [];

    // Don't show theme-specific actions while loading
    if (!isLoading && themeInfo?.details_url) {
      actions.push(
        <Action.OpenInBrowser
          key="open-details"
          title="See More Information"
          url={themeInfo.details_url}
          icon={Icon.Globe}
        />,
      );
    }

    if (!isLoading && themeInfo?.documentation_url) {
      actions.push(
        <Action.OpenInBrowser
          key="open-documentation"
          title="Open Documentation URL"
          url={themeInfo.documentation_url}
          icon={Icon.Globe}
        />,
      );
    }

    if (!isLoading && themeInfo?.theme_name) {
      actions.push(
        <Action.CopyToClipboard
          key="copy-name"
          title="Copy Theme Name"
          content={themeInfo.theme_name}
          icon={Icon.Clipboard}
        />,
      );
    }

    if (!isLoading && themeInfo) {
      actions.push(
        <Action.CopyToClipboard
          key="copy-json"
          title="Copy Full JSON Response"
          content={JSON.stringify(themeInfo, null, 2)}
          icon={Icon.Document}
        />,
      );
    }

    actions.push(
      <Action
        key="refresh"
        title="Refresh"
        onAction={() => fetchThemeInfo()}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />,
    );

    if (error?.includes("API key")) {
      actions.push(
        <Action
          key="preferences"
          title="Open Extension Preferences"
          onAction={openExtensionPreferences}
          icon={Icon.Gear}
        />,
      );
    }

    return actions;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdownContent()}
      metadata={getMetadataItems()}
      actions={<ActionPanel>{getActions()}</ActionPanel>}
    />
  );
}
