import { Clipboard, showToast, Toast } from "@raycast/api";

interface CleanResult {
  cleanedContent: string;
  contentType: "url" | "mailto" | "text";
  originalContent: string;
}

// URL cleaning patterns - because the internet is messy, darling
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "ref",
  "source",
  "campaign",
];

const GOOGLE_DOC_PATTERNS = [
  /\/document\/d\/([a-zA-Z0-9-_]+)/,
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  /\/presentation\/d\/([a-zA-Z0-9-_]+)/,
  /\/forms\/d\/([a-zA-Z0-9-_]+)/,
];

function decodeTrackingUrl(url: string): string | null {
  try {
    // Customer.io pattern
    const customerIoMatch = url.match(/e\.customeriomail\.com\/e\/c\/([^/?]+)/);
    if (customerIoMatch) {
      const encodedData = customerIoMatch[1];
      const decodedData = atob(encodedData);
      const jsonData = JSON.parse(decodedData);
      if (jsonData.href) return jsonData.href;
    }

    // Generic Base64 URL parameter detection
    // Look for suspiciously long Base64-like parameters
    const urlObj = new URL(url);
    for (const [, value] of urlObj.searchParams) {
      if (value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value)) {
        try {
          const decoded = atob(value);
          // Try to find URLs in the decoded content
          const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
          if (urlMatch) return urlMatch[0];

          // Try to parse as JSON and extract href
          const jsonData = JSON.parse(decoded);
          if (jsonData.href) return jsonData.href;
          if (jsonData.url) return jsonData.url;
          if (jsonData.link) return jsonData.link;
        } catch {
          // Not valid Base64 or JSON, continue
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveRedirects(url: string): Promise<string> {
  try {
    // Validate URL scheme for security
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Longer timeout for redirects

    try {
      // Try with a more convincing browser User-Agent
      const response = await fetch(url, {
        signal: controller.signal,
        method: "GET", // Changed from HEAD to GET for better compatibility
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      // Return the final URL after all redirects
      const finalUrl = response.url;
      console.log(`Redirect resolution: ${url} -> ${finalUrl}`);
      return finalUrl;
    } finally {
      clearTimeout(timeoutId); // FIXED: Clear timeout to prevent memory leak
    }
  } catch (error) {
    console.log(`Redirect resolution failed for ${url}:`, error);
    return url; // Return original if resolution fails
  }
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    // Validate URL scheme for security - we're not animals
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow", // Follow redirects to get final URL
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim().replace(/\s+/g, " ");
      }

      return null;
    } finally {
      clearTimeout(timeoutId); // FIXED: Clear timeout to prevent memory leak
    }
  } catch {
    return null;
  }
}

function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Security check - only allow HTTP/HTTPS schemes
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return url; // Return original if invalid scheme
    }

    // Remove tracking parameters like a good digital cleaner
    TRACKING_PARAMS.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    // Clean up fragment identifiers that are just noise
    if (urlObj.hash && urlObj.hash.match(/^#[a-f0-9]{8,}$/)) {
      urlObj.hash = "";
    }

    return urlObj.toString();
  } catch {
    return url; // If URL parsing fails, return original
  }
}

function getReadableFormat(url: string): string {
  try {
    const urlObj = new URL(url);

    // Security check - only process HTTP/HTTPS URLs
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return url; // Return original if invalid scheme
    }

    // Google Docs get special treatment - they're special snowflakes
    for (const pattern of GOOGLE_DOC_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        const docId = match[1];
        const type = url.includes("/document/")
          ? "Google Doc"
          : url.includes("/spreadsheets/")
            ? "Google Sheet"
            : url.includes("/presentation/")
              ? "Google Slides"
              : "Google Form";
        return `${type}: ${docId}`;
      }
    }

    // Default readable format
    const domain = urlObj.hostname.replace(/^www\./, "");
    const path = urlObj.pathname.split("/").filter(Boolean).join(" > ");

    return path ? `${domain} > ${path}` : domain;
  } catch {
    return url; // If URL parsing fails, return original
  }
}

async function cleanContent(content: string): Promise<CleanResult> {
  const trimmed = content.trim();

  // Handle mailto links - extract just the email address
  // Also catch malformed URLs like https://mailto:email@domain.com
  if (trimmed.startsWith("mailto:") || trimmed.includes("mailto:")) {
    let emailPart = trimmed;
    if (trimmed.includes("mailto:")) {
      emailPart = trimmed.substring(trimmed.indexOf("mailto:") + 7);
    }
    const emailOnly = emailPart.split("?")[0];
    return {
      cleanedContent: emailOnly,
      contentType: "mailto",
      originalContent: content,
    };
  }

  // Handle URLs - the main event
  if (trimmed.match(/^https?:\/\//)) {
    // Try to decode tracking URLs first (Customer.io and others)
    const decodedUrl = decodeTrackingUrl(trimmed);
    let urlToProcess = decodedUrl || trimmed;

    // If decoding failed, try redirect resolution
    if (!decodedUrl) {
      urlToProcess = await resolveRedirects(trimmed);
    }

    const cleanedUrl = cleanUrl(urlToProcess);

    // Race condition: instant basic cleaning vs fancy title fetching
    const basicResult = {
      cleanedContent: cleanedUrl,
      contentType: "url" as const,
      originalContent: content,
    };

    // Try to get page title for extra fanciness
    const title = await fetchPageTitle(cleanedUrl);
    if (title && title.length > 0 && title.length < 200) {
      return {
        ...basicResult,
        cleanedContent: `${title} - ${cleanedUrl}`,
      };
    }

    // Fallback to readable format
    const readable = getReadableFormat(cleanedUrl);
    return {
      ...basicResult,
      cleanedContent: `${readable} - ${cleanedUrl}`,
    };
  }

  // Plain text - boring but necessary
  return {
    cleanedContent: trimmed,
    contentType: "text",
    originalContent: content,
  };
}

export default async function Command() {
  try {
    // Show loading toast because waiting builds character
    await showToast({
      style: Toast.Style.Animated,
      title: "UnLinking...",
      message: "Cleaning up your messy clipboard",
    });

    // Get clipboard content
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to clean",
        message: "Your clipboard is emptier than your promises",
      });
      return;
    }

    // Clean the content
    const result = await cleanContent(clipboardContent);

    // Only update clipboard if content actually changed
    if (result.cleanedContent !== result.originalContent) {
      await Clipboard.copy(result.cleanedContent);

      const typeEmoji = result.contentType === "url" ? "🔗" : result.contentType === "mailto" ? "📧" : "📝";

      await showToast({
        style: Toast.Style.Success,
        title: `${typeEmoji} Cleaned ${result.contentType}`,
        message: "Clipboard updated with clean content",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Already clean",
        message: "Your clipboard was surprisingly well-behaved",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "UnLink failed",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
