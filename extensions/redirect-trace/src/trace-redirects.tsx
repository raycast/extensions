import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Clipboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  maxRedirects: string;
  timeout: string;
}

interface RedirectStep {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

interface RedirectChain {
  originalUrl: string;
  finalUrl: string;
  steps: RedirectStep[];
  totalRedirects: number;
  isComplete: boolean;
  error?: string;
}

export default function TraceRedirects() {
  const [searchText, setSearchText] = useState("");
  const [redirectChain, setRedirectChain] = useState<RedirectChain | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const maxRedirects = parseInt(preferences.maxRedirects || "10", 10);
  const timeout = parseInt(preferences.timeout || "5000", 10);

  const validateUrl = (url: string): string => {
    if (!url) return "";

    // Trim whitespace and remove line breaks that might come from pasting
    const cleanUrl = url.trim().replace(/[\r\n\t]/g, "");

    // Add protocol if missing
    if (!cleanUrl.match(/^https?:\/\//)) {
      return `https://${cleanUrl}`;
    }
    return cleanUrl;
  };

  const cleanTrackingParams = (url: string): string => {
    try {
      const urlObj = new URL(url);

      // Common tracking parameters to remove
      const trackingParams = [
        // Google Analytics & Marketing
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "gclid",
        "gclsrc",
        "dclid",
        "gbraid",
        "wbraid",

        // Facebook/Meta
        "fbclid",
        "fb_action_ids",
        "fb_action_types",
        "fb_ref",
        "fb_source",

        // Email & Marketing platforms
        "mc_cid",
        "mc_eid", // MailChimp
        "inf_ver",
        "inf_ctx", // Inflection/tracking systems
        "_hsenc",
        "_hsmi", // HubSpot
        "vero_conv",
        "vero_id", // Vero
        "pk_campaign",
        "pk_kwd", // Piwik/Matomo

        // Social media
        "igshid",
        "igsh", // Instagram
        "ref_src",
        "ref_url", // Generic referrer tracking
        "share",
        "shared",

        // Microsoft/Bing
        "msclkid",

        // Other common tracking
        "source",
        "medium",
        "campaign",
        "_branch_match_id",
        "_branch_referrer", // Branch.io
        "mkt_tok", // Marketo
        "trk",
        "trkCampaign", // Generic tracking
        "ref",
        "referrer",
        "cmpid",
        "WT.mc_id", // Various campaign IDs

        // Analytics platforms
        "_ga",
        "_gl", // Google Analytics client ID
        "affiliate_id",
        "aff_id",
        "click_id",
        "clickid",

        // Newsletter/email specific
        "newsletter_id",
        "email_id",
        "subscriber_id",

        // Specific to some tracking systems
        "s_cid",
        "ncid", // Adobe/Omniture
        "zanpid",
        "ranMID",
        "ranEAID",
        "ranSiteID", // Rakuten/Commission Junction
      ];

      // Remove tracking parameters
      trackingParams.forEach((param) => {
        urlObj.searchParams.delete(param);
      });

      // Remove parameters that look like tracking (heuristic approach)
      const paramsToCheck = Array.from(urlObj.searchParams.keys());
      paramsToCheck.forEach((param) => {
        // Remove params that are clearly tracking IDs (long random strings)
        if (param.length > 10 && /^[a-zA-Z0-9_-]+$/.test(param)) {
          const value = urlObj.searchParams.get(param);
          if (value && value.length > 20 && /^[a-zA-Z0-9_=+/-]+$/.test(value)) {
            urlObj.searchParams.delete(param);
          }
        }

        // Remove params with tracking-like names (case insensitive)
        if (
          /^(track|trk|tid|cid|sid|eid|campaign|source|medium|ref|click)_?/i.test(
            param,
          )
        ) {
          urlObj.searchParams.delete(param);
        }

        // Remove params that look like encoded data
        if (param.length > 5 && /^[a-zA-Z0-9_]+$/.test(param)) {
          const value = urlObj.searchParams.get(param);
          if (
            value &&
            value.length > 30 &&
            (/[A-Z]{2,}[a-z]+[A-Z]/.test(value) ||
              /^[A-Za-z0-9+/]+=*$/.test(value))
          ) {
            urlObj.searchParams.delete(param);
          }
        }
      });

      // Handle malformed URLs that have parameters in the path (like your example)
      let cleanPath = urlObj.pathname;
      if (cleanPath.includes("&")) {
        // Extract the actual path before any parameters
        const pathParts = cleanPath.split("&");
        cleanPath = pathParts[0];

        // Update the URL object
        urlObj.pathname = cleanPath;
      }

      // Return clean URL
      const cleanUrl = urlObj.toString();

      // Remove trailing ? if no parameters remain
      return cleanUrl.endsWith("?") ? cleanUrl.slice(0, -1) : cleanUrl;
    } catch {
      // If URL parsing fails, try manual cleaning for malformed URLs
      try {
        // Handle URLs with malformed query strings
        if (url.includes("&")) {
          const parts = url.split("&");
          const cleanPart = parts[0];

          // Try to parse the clean part
          const testUrl = new URL(cleanPart);
          return testUrl.toString();
        }
      } catch {
        // If all parsing fails, try basic string manipulation
        const ampIndex = url.indexOf("&");
        if (ampIndex > 0) {
          return url.substring(0, ampIndex);
        }
      }

      // Return original if nothing works
      return url;
    }
  };

  const getUrlPreview = (url: string): { display: string; full: string } => {
    try {
      const urlObj = new URL(url);
      return {
        display: `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search ? "?" + urlObj.search.substring(1, 20) + (urlObj.search.length > 21 ? "..." : "") : ""}`,
        full: url,
      };
    } catch {
      return {
        display: url.length > 60 ? `${url.substring(0, 60)}...` : url,
        full: url,
      };
    }
  };

  const followRedirects = async (url: string): Promise<RedirectChain> => {
    const validatedUrl = validateUrl(url);
    const steps: RedirectStep[] = [];
    let currentUrl = validatedUrl;
    let redirectCount = 0;

    if (validatedUrl.length > 500) {
      showToast({
        style: Toast.Style.Animated,
        title: "Processing Long URL",
        message: `${Math.round(validatedUrl.length / 100) / 10}k characters - analyzing...`,
      });
    }

    try {
      while (redirectCount < maxRedirects) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(currentUrl, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": "RedirectTrace-Raycast-Extension/1.0",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept-Encoding": "gzip, deflate, br",
              DNT: "1",
              Connection: "keep-alive",
              "Upgrade-Insecure-Requests": "1",
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          clearTimeout(timeoutId);

          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });

          steps.push({
            url: currentUrl,
            status: response.status,
            statusText: response.statusText,
            headers,
          });

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) {
              break;
            }

            try {
              let nextUrl;
              if (location.startsWith("http")) {
                nextUrl = location;
              } else if (location.startsWith("/")) {
                const baseUrl = new URL(currentUrl);
                nextUrl = `${baseUrl.protocol}//${baseUrl.host}${location}`;
              } else {
                nextUrl = new URL(location, currentUrl).href;
              }

              currentUrl = nextUrl;
              redirectCount++;
            } catch {
              try {
                const decodedLocation = decodeURIComponent(location);
                let nextUrl;
                if (decodedLocation.startsWith("http")) {
                  nextUrl = decodedLocation;
                } else if (decodedLocation.startsWith("/")) {
                  const baseUrl = new URL(currentUrl);
                  nextUrl = `${baseUrl.protocol}//${baseUrl.host}${decodedLocation}`;
                } else {
                  nextUrl = new URL(decodedLocation, currentUrl).href;
                }
                currentUrl = nextUrl;
                redirectCount++;
              } catch {
                break;
              }
            }
          } else {
            break;
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);

          let errorMessage = "Unknown error occurred";
          if (fetchError instanceof Error) {
            if (fetchError.name === "AbortError") {
              errorMessage = `Request timeout after ${timeout}ms`;
            } else if (fetchError.message.includes("ENOTFOUND")) {
              errorMessage = "DNS resolution failed - domain not found";
            } else if (fetchError.message.includes("ECONNREFUSED")) {
              errorMessage = "Connection refused by server";
            } else if (fetchError.message.includes("certificate")) {
              errorMessage = "SSL certificate error";
            } else if (fetchError.message.includes("CORS")) {
              errorMessage = "CORS policy blocked the request";
            } else if (fetchError.message.includes("Failed to fetch")) {
              errorMessage =
                "Network request failed - possible CORS or security restriction";
            } else {
              errorMessage = fetchError.message;
            }
          }

          throw new Error(errorMessage);
        }
      }

      return {
        originalUrl: validatedUrl,
        finalUrl: currentUrl,
        steps,
        totalRedirects: redirectCount,
        isComplete: redirectCount < maxRedirects,
      };
    } catch (error) {
      return {
        originalUrl: validatedUrl,
        finalUrl: currentUrl,
        steps,
        totalRedirects: redirectCount,
        isComplete: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  // Check clipboard for long URLs on component mount
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();

        if (clipboardText) {
          const isUrl =
            clipboardText.startsWith("http://") ||
            clipboardText.startsWith("https://");
          const isLong = clipboardText.length > 500;

          if (isUrl && isLong) {
            setClipboardUrl(clipboardText);
            showToast({
              style: Toast.Style.Success,
              title: "Long URL detected in clipboard",
              message: `${Math.round(clipboardText.length / 100) / 10}k characters - Use 'Paste Long URL' action`,
            });
          }
        }
      } catch {
        // Clipboard access failed, ignore silently
      }
    };

    // Delay slightly to ensure extension is fully loaded
    const timer = setTimeout(checkClipboard, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add manual clipboard check action
  const checkClipboardManually = async () => {
    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText) {
        showToast({
          style: Toast.Style.Failure,
          title: "No clipboard content",
          message: "Copy a URL to clipboard first",
        });
        return;
      }

      const isUrl =
        clipboardText.startsWith("http://") ||
        clipboardText.startsWith("https://");
      if (!isUrl) {
        showToast({
          style: Toast.Style.Failure,
          title: "Not a URL",
          message: "Clipboard doesn't contain a valid URL",
        });
        return;
      }

      if (clipboardText.length < 500) {
        showToast({
          style: Toast.Style.Success,
          title: "URL detected",
          message: "Pasted directly in search bar",
        });
        // Auto-paste the URL into search if it's short enough
        setSearchText(clipboardText);
        return;
      }

      setClipboardUrl(clipboardText);
      showToast({
        style: Toast.Style.Success,
        title: "Long URL detected!",
        message: `${Math.round(clipboardText.length / 100) / 10}k characters ready to trace`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Clipboard access failed",
        message: "Unable to read clipboard content",
      });
    }
  };

  const traceFromClipboard = async () => {
    if (clipboardUrl) {
      setSearchText("");
      setIsLoading(true);
      try {
        const result = await followRedirects(clipboardUrl);
        setRedirectChain(result);
        showToast({
          style: Toast.Style.Success,
          title: "Traced clipboard URL",
          message: `Found ${result.totalRedirects} redirects`,
        });
      } catch (error) {
        showFailureToast(error, { title: "Error tracing clipboard URL" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Debounced effect for URL tracing
  useEffect(() => {
    if (!searchText.trim()) {
      setRedirectChain(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await followRedirects(searchText);
        setRedirectChain(result);
      } catch (error) {
        showFailureToast(error, { title: "Error tracing redirects" });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, maxRedirects, timeout]);

  const getStatusIcon = (status: number): Icon => {
    if (status >= 200 && status < 300) return Icon.CheckCircle;
    if (status >= 300 && status < 400) return Icon.ArrowRight;
    if (status >= 400 && status < 500) return Icon.ExclamationMark;
    if (status >= 500) return Icon.XMarkCircle;
    return Icon.QuestionMark;
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return "#00FF00";
    if (status >= 300 && status < 400) return "#FFA500";
    if (status >= 400 && status < 500) return "#FF4500";
    if (status >= 500) return "#FF0000";
    return "#808080";
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter URL to trace redirects... (Long URLs? Copy to clipboard and use Cmd+V)"
      searchBarAccessory={
        clipboardUrl ? (
          <List.Dropdown tooltip="Clipboard URL detected">
            <List.Dropdown.Item
              title="📋 Long URL in clipboard - use action below"
              value="clipboard"
            />
          </List.Dropdown>
        ) : undefined
      }
      throttle
    >
      {!searchText && !redirectChain && clipboardUrl && (
        <List.Section title="Clipboard URL Detected">
          <List.Item
            icon={Icon.Clipboard}
            title="Paste Long URL From Clipboard"
            subtitle={`${clipboardUrl.length} characters - ${clipboardUrl.substring(0, 100)}...`}
            accessories={[
              {
                text: `${Math.round(clipboardUrl.length / 100) / 10}k chars`,
                icon: Icon.Document,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Trace This URL"
                  icon={Icon.Link}
                  onAction={traceFromClipboard}
                />
                <Action.CopyToClipboard
                  title="Copy Full URL"
                  content={clipboardUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Clear Clipboard Detection"
                  icon={Icon.Trash}
                  onAction={() => setClipboardUrl(null)}
                  shortcut={{ modifiers: ["cmd"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!searchText && !redirectChain && !clipboardUrl && (
        <List.Section title="How to Use">
          <List.Item
            icon={Icon.Info}
            title="For URLs Under 500 Characters"
            subtitle="Type or paste directly in the search bar above"
          />
          <List.Item
            icon={Icon.Clipboard}
            title="For Very Long URLs (500+ Characters)"
            subtitle="Copy URL to clipboard first, then use 'Check Clipboard' below"
            actions={
              <ActionPanel>
                <Action
                  title="Check Clipboard for Long Urls"
                  icon={Icon.Clipboard}
                  onAction={checkClipboardManually}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Globe}
            title="Supported URL Types"
            subtitle="HTTP/HTTPS, shortened URLs, tracking links, email redirects"
          />
          <List.Item
            icon={Icon.QuestionMark}
            title="Clipboard Not Detected Automatically?"
            subtitle="Use 'Check Clipboard' action on the long URLs option above"
            actions={
              <ActionPanel>
                <Action
                  title="Check Clipboard Now"
                  icon={Icon.Clipboard}
                  onAction={checkClipboardManually}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {redirectChain && (
        <>
          <List.Section title="Summary">
            <List.Item
              icon={Icon.Globe}
              title={`${redirectChain.totalRedirects} redirect${redirectChain.totalRedirects !== 1 ? "s" : ""}`}
              subtitle={`From: ${getUrlPreview(redirectChain.originalUrl).display}`}
              accessories={[
                {
                  text: redirectChain.isComplete ? "Complete" : "Incomplete",
                  icon: redirectChain.isComplete
                    ? Icon.CheckCircle
                    : Icon.ExclamationMark,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Final URL"
                    content={redirectChain.finalUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Final URL"
                    url={redirectChain.finalUrl}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Original URL"
                    content={redirectChain.originalUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Full Chain Report"
                    content={`URL Redirect Chain Report:
Original: ${redirectChain.originalUrl}
Final: ${redirectChain.finalUrl}
Total Redirects: ${redirectChain.totalRedirects}

Chain Details:
${redirectChain.steps.map((step, i) => `${i + 1}. ${step.status} ${step.statusText} - ${step.url}`).join("\n")}
${redirectChain.error ? `\nError: ${redirectChain.error}` : ""}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Urls"
                    content={redirectChain.steps
                      .map((step) => step.url)
                      .join("\n")}
                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Compass}
              title="Final Destination"
              subtitle={getUrlPreview(redirectChain.finalUrl).display}
              accessories={[
                {
                  text:
                    redirectChain.finalUrl.length > 100
                      ? `${Math.round(redirectChain.finalUrl.length / 100) / 10}k chars`
                      : `${redirectChain.finalUrl.length} chars`,
                  tooltip: redirectChain.finalUrl,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Final URL"
                    content={redirectChain.finalUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Final URL"
                    url={redirectChain.finalUrl}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Clean URL (No Tracking)"
                    content={cleanTrackingParams(redirectChain.finalUrl)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Original URL"
                    content={redirectChain.originalUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Full Chain Report"
                    content={`URL Redirect Chain Report:
Original: ${redirectChain.originalUrl}
Final: ${redirectChain.finalUrl}
Clean: ${cleanTrackingParams(redirectChain.finalUrl)}
Total Redirects: ${redirectChain.totalRedirects}

Chain Details:
${redirectChain.steps.map((step, i) => `${i + 1}. ${step.status} ${step.statusText} - ${step.url}`).join("\n")}
${redirectChain.error ? `\nError: ${redirectChain.error}` : ""}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action
                    title="Show Full URL"
                    icon={Icon.Eye}
                    onAction={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Full URL",
                        message: redirectChain.finalUrl,
                      });
                    }}
                  />
                  <Action
                    title="Show Clean URL"
                    icon={Icon.EyeSlash}
                    onAction={() => {
                      const cleanUrl = cleanTrackingParams(
                        redirectChain.finalUrl,
                      );
                      showToast({
                        style: Toast.Style.Success,
                        title: "Clean URL",
                        message: cleanUrl,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                </ActionPanel>
              }
            />
            {(() => {
              const cleanUrl = cleanTrackingParams(redirectChain.finalUrl);
              const hasTracking = cleanUrl !== redirectChain.finalUrl;

              return hasTracking ? (
                <List.Item
                  icon={Icon.EyeSlash}
                  title="Clean URL (Tracking Removed)"
                  subtitle={getUrlPreview(cleanUrl).display}
                  accessories={[
                    {
                      text: `${redirectChain.finalUrl.length - cleanUrl.length} chars removed`,
                      tooltip: `Removed ${redirectChain.finalUrl.length - cleanUrl.length} characters of tracking parameters`,
                      icon: Icon.Trash,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Clean URL"
                        content={cleanUrl}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Clean URL"
                        url={cleanUrl}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Original Final URL"
                        content={redirectChain.finalUrl}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action
                        title="Show Clean URL"
                        icon={Icon.EyeSlash}
                        onAction={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "Clean URL",
                            message: cleanUrl,
                          });
                        }}
                      />
                      <Action
                        title="Compare Urls"
                        icon={Icon.TwoArrowsClockwise}
                        onAction={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "URL Comparison",
                            message: `Original: ${redirectChain.finalUrl.length} chars\nClean: ${cleanUrl.length} chars\nRemoved: ${redirectChain.finalUrl.length - cleanUrl.length} chars`,
                          });
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ) : null;
            })()}
          </List.Section>

          {redirectChain.steps.length > 0 && (
            <List.Section title="Redirect Chain">
              {redirectChain.steps.map((step, index) => {
                const urlPreview = getUrlPreview(step.url);
                return (
                  <List.Item
                    key={index}
                    icon={{
                      source: getStatusIcon(step.status),
                      tintColor: getStatusColor(step.status),
                    }}
                    title={`${step.status} ${step.statusText}`}
                    subtitle={urlPreview.display}
                    accessories={[
                      {
                        text: `Step ${index + 1}`,
                      },
                      {
                        text:
                          step.url.length > 100
                            ? `${Math.round(step.url.length / 100) / 10}k`
                            : `${step.url.length}`,
                        tooltip: `URL length: ${step.url.length} characters`,
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy URL"
                          content={step.url}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.OpenInBrowser
                          title="Open URL"
                          url={step.url}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Clean URL (No Tracking)"
                          content={cleanTrackingParams(step.url)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Headers"
                          content={JSON.stringify(step.headers, null, 2)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy All Urls up to This Step"
                          content={redirectChain.steps
                            .slice(0, index + 1)
                            .map((s) => s.url)
                            .join("\n")}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Step Details"
                          content={`Step ${index + 1}: ${step.status} ${step.statusText}
URL: ${step.url}
Clean URL: ${cleanTrackingParams(step.url)}
Headers: ${JSON.stringify(step.headers, null, 2)}`}
                          shortcut={{
                            modifiers: ["cmd", "shift", "opt"],
                            key: "c",
                          }}
                        />
                        <Action
                          title="Show Full URL"
                          icon={Icon.Eye}
                          onAction={() => {
                            showToast({
                              style: Toast.Style.Success,
                              title: "Full URL",
                              message: step.url,
                            });
                          }}
                          shortcut={{ modifiers: ["cmd"], key: "i" }}
                        />
                        <Action
                          title="Show Clean URL"
                          icon={Icon.EyeSlash}
                          onAction={() => {
                            const cleanUrl = cleanTrackingParams(step.url);
                            showToast({
                              style: Toast.Style.Success,
                              title: "Clean URL",
                              message: cleanUrl,
                            });
                          }}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {redirectChain.error && (
            <List.Section title="Error">
              <List.Item
                icon={Icon.ExclamationMark}
                title="Error"
                subtitle={redirectChain.error}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Error"
                      content={redirectChain.error}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
