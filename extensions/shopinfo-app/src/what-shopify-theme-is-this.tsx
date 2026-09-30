import React from "react";
import {
  getFrontmostApplication,
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBrowserURL } from "./utils";
import { useState, useEffect } from "react";
import { Preferences, ShopifyThemeInfo } from "./types";

type StepStatus = "pending" | "loading" | "success" | "error";

interface Step {
  id: string;
  title: string;
  subtitle?: string;
  status: StepStatus;
  detail?: string;
  error?: string;
}

export default function Command() {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "browser-check",
      title: "Browser Check",
      subtitle: "Detecting open browser...",
      status: "pending",
    },
    {
      id: "theme-analysis",
      title: "Theme Analysis",
      subtitle: "Analyzing Shopify store...",
      status: "pending",
    },
    {
      id: "theme-details",
      title: "Theme Details",
      subtitle: "Fetching theme information...",
      status: "pending",
    },
  ]);

  const [themeInfo, setThemeInfo] = useState<ShopifyThemeInfo | null>(null);
  const [currentURL, setCurrentURL] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetchThemeInfo(controller.signal);
    return () => controller.abort();
  }, []);

  const updateStep = (stepId: string, updates: Partial<Step>) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)));
  };

  const fetchThemeInfo = async (signal?: AbortSignal) => {
    try {
      const preferences = getPreferenceValues<Preferences>();

      // Check API key first
      if (!preferences.apiKey) {
        updateStep("browser-check", {
          status: "error",
          error: "API key not configured",
          detail: "Please set your API key in extension preferences",
        });
        await showToast({
          title: "API key not configured",
          style: Toast.Style.Failure,
        });
        return;
      }

      // Step 1: Check browser
      updateStep("browser-check", { status: "loading", subtitle: "Checking for open browser..." });

      const frontmostApp = await getFrontmostApplication();
      const url = await getBrowserURL(frontmostApp.name);

      if (!url) {
        updateStep("browser-check", {
          status: "error",
          error: "No browser detected",
          detail: "Please open a Shopify store in your browser and try again",
        });
        await showToast({
          title: "No website open",
          style: Toast.Style.Failure,
        });
        return;
      }

      setCurrentURL(url);
      updateStep("browser-check", {
        status: "success",
        subtitle: "Browser found",
        detail: url,
      });

      // Step 2: Analyze theme
      updateStep("theme-analysis", {
        status: "loading",
        subtitle: "Analyzing Shopify theme...",
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
        let errorMessage = "Failed to analyze theme";
        if (response.status === 400) {
          errorMessage = "Bad request. Please provide URL.";
        } else if (response.status === 401) {
          errorMessage = "Unauthorized. Invalid API key";
        } else if (response.status === 404) {
          errorMessage = "Not a Shopify store or theme name not detected";
        }

        updateStep("theme-analysis", {
          status: "error",
          error: errorMessage,
          detail: `Status: ${response.status} - ${response.statusText}`,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.theme) {
        updateStep("theme-analysis", {
          status: "error",
          error: "No theme found",
          detail: data.error || "This may not be a Shopify store",
        });
        throw new Error(data.error || "No theme information found");
      }

      updateStep("theme-analysis", {
        status: "success",
        subtitle: "Theme identified",
        detail: data.theme.name || "Unknown theme",
      });

      // Step 3: Get theme details
      updateStep("theme-details", {
        status: "loading",
        subtitle: "Fetching theme details...",
      });

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

      setThemeInfo(themeData);
      setSelectedItemId("theme-details"); // Auto-select the theme details item

      const versionInfo = themeData.theme_version
        ? `v${themeData.theme_version}${themeData.update_available ? " (Update available)" : ""}`
        : "";

      updateStep("theme-details", {
        status: "success",
        subtitle: "Details retrieved",
        detail: `${themeData.theme_name} ${versionInfo}`,
      });

      await showToast({
        title: "Theme information retrieved",
        style: Toast.Style.Success,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("Error fetching theme info:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";

      // Update the current loading step to error
      const loadingStep = steps.find((s) => s.status === "loading");
      if (loadingStep) {
        updateStep(loadingStep.id, {
          status: "error",
          error: "Failed",
          detail: errorMessage,
        });
      }

      await showFailureToast(err, { title: "Could not fetch theme info" });
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step.status) {
      case "pending":
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
      case "loading":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      case "success":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "error":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
    }
  };

  const getStepAccessories = (step: Step) => {
    const accessories: List.Item.Accessory[] = [];

    if (step.status === "loading") {
      accessories.push({ text: "Loading...", icon: Icon.CircleProgress });
    } else if (step.status === "success" && step.detail) {
      accessories.push({
        text: step.detail.length > 50 ? step.detail.substring(0, 50) + "..." : step.detail,
        tooltip: step.detail,
      });
    } else if (step.status === "error" && step.error) {
      accessories.push({
        text: step.error,
        icon: Icon.ExclamationMark,
        tooltip: step.detail,
      });
    }

    return accessories;
  };

  const getActions = () => {
    const actions: React.ReactElement[] = [];

    // Theme-specific actions when successfully loaded
    if (themeInfo) {
      if (themeInfo.details_url) {
        actions.push(
          <Action.OpenInBrowser
            key="open-details"
            title="See More Information"
            url={themeInfo.details_url}
            icon={Icon.Globe}
          />,
        );
      }

      if (themeInfo.documentation_url) {
        actions.push(
          <Action.OpenInBrowser
            key="open-documentation"
            title="Open Documentation"
            url={themeInfo.documentation_url}
            icon={Icon.Book}
          />,
        );
      }

      if (themeInfo.theme_name) {
        actions.push(
          <Action.CopyToClipboard
            key="copy-name"
            title="Copy Theme Name"
            content={themeInfo.theme_name}
            icon={Icon.Clipboard}
          />,
        );
      }

      actions.push(
        <Action.CopyToClipboard
          key="copy-json"
          title="Copy Full Details"
          content={JSON.stringify(themeInfo, null, 2)}
          icon={Icon.Document}
        />,
      );
    }

    // Always show refresh
    actions.push(
      <Action
        key="refresh"
        title="Refresh"
        onAction={() => {
          // Reset all steps to pending
          setSteps(steps.map((s) => ({ ...s, status: "pending" })));
          setThemeInfo(null);
          setSelectedItemId(undefined);
          fetchThemeInfo();
        }}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />,
    );

    // Show preferences if API key error
    const hasApiKeyError = steps.some((s) => s.error?.includes("API key"));
    if (hasApiKeyError) {
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
    <List selectedItemId={selectedItemId} isShowingDetail={themeInfo !== null}>
      <List.Section title="Shopify Theme Checker">
        {steps.map((step) => (
          <List.Item
            id={step.id}
            key={step.id}
            title={step.title}
            subtitle={step.status === "error" && step.detail ? step.detail : step.subtitle}
            icon={getStepIcon(step)}
            accessories={getStepAccessories(step)}
            actions={<ActionPanel>{getActions()}</ActionPanel>}
            detail={
              themeInfo && step.id === "theme-details" ? (
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {themeInfo.theme_name && (
                        <List.Item.Detail.Metadata.Label title="Theme Name" text={themeInfo.theme_name} />
                      )}
                      {themeInfo.theme_vendor && (
                        <List.Item.Detail.Metadata.Label title="Developer" text={themeInfo.theme_vendor} />
                      )}
                      {themeInfo.theme_version && (
                        <List.Item.Detail.Metadata.Label title="Current Version" text={themeInfo.theme_version} />
                      )}
                      {themeInfo.latest_version && (
                        <List.Item.Detail.Metadata.Label title="Latest Version" text={themeInfo.latest_version} />
                      )}
                      {themeInfo.update_available !== undefined && (
                        <List.Item.Detail.Metadata.Label
                          title="Update Status"
                          text={themeInfo.update_available ? "Update Available" : "Up to Date"}
                          icon={themeInfo.update_available ? Icon.ExclamationMark : Icon.Check}
                        />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      {currentURL && <List.Item.Detail.Metadata.Label title="Checked URL" text={currentURL} />}
                      {themeInfo.detection_method && (
                        <List.Item.Detail.Metadata.Label title="Detection Method" text={themeInfo.detection_method} />
                      )}
                      {themeInfo.checked_at && (
                        <List.Item.Detail.Metadata.Label
                          title="Last Checked"
                          text={new Date(themeInfo.checked_at).toLocaleString()}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : null
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
