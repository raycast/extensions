import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  validateCredentials,
  type ValidationResult,
} from "@mcdays/cloudflare-images-core";
import { buildCloudflareConfig, getPreferences } from "./lib/config.js";

/**
 * The "Validate Cloudflare Credentials" command. The first command users
 * should run after installing the extension — it sanity-checks the Account
 * ID, API Token, and Account Hash by hitting the Cloudflare Images list endpoint.
 *
 * Surface notes:
 *  - `accountHash` cannot be verified server-side. We do a presence check and
 *    show a hint about where to find it.
 *  - Errors are presented as actionable detail (open prefs, retry).
 */
export default function ValidateCredentialsCommand() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "done"; result: ValidationResult }
    | { kind: "error"; error: Error }
  >({ kind: "loading" });

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ kind: "loading" });
      try {
        const prefs = getPreferences();
        const config = buildCloudflareConfig(prefs);
        const result = await validateCredentials(config);
        if (!cancelled) {
          setState({ kind: "done", result });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const markdown = buildMarkdown(state);

  return (
    <Detail
      isLoading={state.kind === "loading"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            onAction={() => setVersion((v) => v + 1)}
          />
          <Action
            title="Open Cloudflare Images Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Cloudflare Dashboard"
            url="https://dash.cloudflare.com/?to=/:account/images"
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser
            title="API Tokens"
            url="https://dash.cloudflare.com/profile/api-tokens"
            icon={Icon.Key}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  state:
    | { kind: "loading" }
    | { kind: "done"; result: ValidationResult }
    | { kind: "error"; error: Error },
): string {
  if (state.kind === "loading") {
    return [
      "# Checking your Cloudflare credentials…",
      "",
      "Pinging `accounts/{accountId}/images/v1` to confirm your API token works and your account has access to Cloudflare Images.",
    ].join("\n");
  }

  if (state.kind === "error") {
    return [
      "# ⚠️ Something went wrong inside the extension",
      "",
      "This is a bug in the extension itself, not a Cloudflare config issue.",
      "",
      "```",
      state.error.message,
      "```",
    ].join("\n");
  }

  const { result } = state;
  if (result.ok) {
    const countLine =
      result.imageCount !== null
        ? `Found **${result.imageCount}** image${result.imageCount === 1 ? "" : "s"} in your account.`
        : "(Cloudflare didn't return a count in the response, but the call succeeded.)";

    return [
      "# ✅ Looks good",
      "",
      "Your **Account ID** and **API Token** are working — Cloudflare accepted the request and returned a valid response from the Images API.",
      "",
      countLine,
      "",
      "## What this *didn't* check",
      "",
      "- **Account Hash** isn't verified server-side. It's a public hash used in `imagedelivery.net/{hash}/...` URLs. Double-check by opening any image in the Cloudflare Images dashboard — the hash is in the URL.",
      "- **Signed URL signing key** isn't verified. It'll be fetched lazily the first time you upload with signed URLs enabled.",
      "",
      "## Next steps",
      "",
      "- Run **Set Default Variant** to pick which variant (`/public`, `/hero`, etc.) gets appended to your URLs. Falls back to the Default Variant textfield in preferences if you skip this.",
      "- Try **Upload Clipboard Image** from Raycast's root search to upload a screenshot.",
      "- Open **My Cloudflare Images** to browse what's already in your account.",
    ].join("\n");
  }

  const failureLines: Record<typeof result.reason, string[]> = {
    "missing-account-id": [
      "# ❌ Account ID is missing",
      "",
      "Open **Cloudflare Images** preferences and paste your Account ID.",
      "",
      "**Where to find it:** at https://dash.cloudflare.com, sign in, then look at the URL — it's the long alphanumeric string in the path (`dash.cloudflare.com/{account-id}/...`). Or open the right-hand sidebar in the dashboard; the Account ID is listed there.",
    ],
    "missing-api-token": [
      "# ❌ API Token is missing",
      "",
      "Create one at https://dash.cloudflare.com/profile/api-tokens with the **Cloudflare Images: Edit** permission scoped to the account you're using.",
      "",
      "Then paste it into the extension's preferences (`⌘ ,`).",
    ],
    "missing-account-hash": [
      "# ❌ Account Hash is missing",
      "",
      "Open any image in the Cloudflare Images dashboard. The URL will look like:",
      "",
      "```",
      "https://imagedelivery.net/{ACCOUNT_HASH}/{image-id}/public",
      "```",
      "",
      "Copy the `{ACCOUNT_HASH}` part and paste it into the extension's preferences.",
    ],
    "auth-failed": [
      "# ❌ Cloudflare rejected your API token",
      "",
      "The token is present, but Cloudflare returned **401 / 403**. Most common causes:",
      "",
      "1. The token doesn't have the **Cloudflare Images: Edit** permission",
      "2. The token is scoped to a different account than the one in **Account ID**",
      "3. The token has been revoked or expired",
      "",
      "Open https://dash.cloudflare.com/profile/api-tokens to check.",
      "",
      "**Detail from Cloudflare:**",
      "",
      "```",
      result.detail,
      "```",
    ],
    "account-not-found": [
      "# ❌ Account not found",
      "",
      "Cloudflare returned **404**. Your **Account ID** is probably wrong — double-check it against the URL when you're signed in to https://dash.cloudflare.com.",
      "",
      "**Detail from Cloudflare:**",
      "",
      "```",
      result.detail,
      "```",
    ],
    "network-error": [
      "# ❌ Couldn't reach Cloudflare",
      "",
      "The request failed before getting a response. Check your network and try again.",
      "",
      "**Detail:**",
      "",
      "```",
      result.detail,
      "```",
    ],
    unexpected: [
      "# ❌ Unexpected response from Cloudflare",
      "",
      "Cloudflare returned an HTTP status I didn't expect.",
      "",
      "**Detail:**",
      "",
      "```",
      result.detail,
      "```",
    ],
  };

  return failureLines[result.reason].join("\n");
}
