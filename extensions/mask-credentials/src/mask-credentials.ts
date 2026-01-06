import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    // Read clipboard content
    const text = await Clipboard.readText();

    // Handle empty clipboard
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    // Mask credentials
    const masked = maskCredentials(text);

    // Copy sanitized result back to clipboard
    await Clipboard.copy(masked);

    // Show success notification (indicate if changes were made)
    const changed = masked !== text;
    await showToast({
      style: Toast.Style.Success,
      title: changed ? "Credentials masked!" : "No credentials found",
      message: "Copied to clipboard",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to process clipboard",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function maskCredentials(text: string): string {
  let result = text;

  // Specific Authorization header patterns (Bearer, Basic, etc.)
  result = result.replace(
    /(--header\s+|--Header\s+|-H\s+)(['"])(Authorization:\s*)(Bearer|Basic|Digest|HOBA|Mutual|AWS4-HMAC-SHA256)(\s+)([^'"]+)(\2)/gi,
    "$1$2$3$4 [MASKED]$7",
  );

  // Generic Authorization header (catch any other auth schemes - only if not Bearer/Basic/etc.)
  result = result.replace(
    /(--header\s+|--Header\s+|-H\s+)(['"])(Authorization:\s+)(?!Bearer|Basic|Digest|HOBA|Mutual|AWS4-HMAC-SHA256\s)([^'"]+)(\2)/gi,
    "$1$2$3[MASKED]$5",
  );

  // -u or --user flag
  result = result.replace(
    /(--user\s+|-u\s+)(['"]?)([^\s'"]+)\2/g,
    "$1$2[MASKED]$2",
  );

  // X-API-Key, X-Auth-Token, and similar headers
  result = result.replace(
    /(--header\s+|--Header\s+|-H\s+)(['"])(X-(?:API-Key|Auth-Token|Access-Token|Api-Token):\s*)([^'"]+)(\2)/gi,
    "$1$2$3[MASKED]$5",
  );

  // Cookie header
  result = result.replace(
    /(--header\s+|--Header\s+|-H\s+)(['"])(Cookie:\s*)([^'"]+)(\2)/gi,
    "$1$2$3[MASKED]$5",
  );

  // URL embedded credentials (https://user:pass@host)
  result = result.replace(
    /(https?:\/\/)([^:]+):([^@]+)@/gi,
    "$1[MASKED]:[MASKED]@",
  );

  // API key in query params
  result = result.replace(
    /([?&])(api[_-]?key|access[_-]?token|auth[_-]?token|token)=([^&\s'"]+)/gi,
    "$1$2=[MASKED]",
  );

  // AWS security headers
  result = result.replace(
    /(--header\s+|--Header\s+|-H\s+)(['"])(X-Amz-Security-Token:\s*)([^'"]+)(\2)/gi,
    "$1$2$3[MASKED]$5",
  );

  // Password/secret/token in JSON body
  result = result.replace(
    /("(?:password|secret|token|api_key|apiKey|access_token|auth_token)":\s*")([^"]+)(")/gi,
    "$1[MASKED]$3",
  );

  return result;
}
