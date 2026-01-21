import { useState, useEffect } from "react";
import {
  Form,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Clipboard,
  useNavigation,
  popToRoot,
} from "@raycast/api";
import net from "node:net";
import { resolveUrl } from "./lib/resolve";
import type { ResolveResult } from "./types";

function parseClampedInt(
  value: string | undefined,
  defaultValue: number,
  { min, max }: { min: number; max: number }
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  const safe = Number.isFinite(parsed) ? parsed : defaultValue;
  return Math.min(max, Math.max(min, safe));
}

function looksLikeUrl(text: string): boolean {
  if (text.length > 2000) return false;
  if (/\s/.test(text)) return false;

  const candidate = text.match(/^https?:\/\//) ? text : `https://${text}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname.includes(".") || net.isIP(hostname) !== 0;
  } catch {
    return false;
  }
}

function ResultsView({ result, onRetry }: { result: ResolveResult; onRetry?: () => void }) {
  const traceMarkdown =
    result.trace.length > 1
      ? `\n\n### Redirect Chain\n${result.trace.map((url, i) => `${i + 1}. \`${url}\``).join("\n")}`
      : "";

  const markdown = result.error
    ? `# Error\n\n${result.error}\n\n---\n\n### Original\n\`${result.originalUrl}\`${traceMarkdown}`
    : `# Resolved URL\n\n### Original\n\`${result.originalUrl}\`${traceMarkdown}\n\n### Final URL\n[${result.finalUrl}](${result.finalUrl})`;

  const isTimeoutError = result.error?.toLowerCase().includes("timeout");

  return (
    <Detail
      markdown={markdown}
      metadata={
        result.finalIp || result.provider ? (
          <Detail.Metadata>
            {result.finalIp ? <Detail.Metadata.Label title="IP Address" text={result.finalIp} /> : null}
            {result.provider ? (
              <Detail.Metadata.Label
                title="Resolved with"
                text={result.provider.charAt(0).toUpperCase() + result.provider.slice(1)}
              />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          {!result.error ? (
            <>
              <Action.OpenInBrowser title="Open in Browser" url={result.finalUrl} onOpen={() => popToRoot()} />
              <Action.CopyToClipboard title="Copy URL" content={result.finalUrl} onCopy={() => popToRoot()} />
              {result.finalIp ? (
                <Action.CopyToClipboard
                  title="Copy IP Address"
                  content={result.finalIp}
                  onCopy={() => popToRoot()}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              ) : null}
              {result.trace.length > 1 ? (
                <Action.CopyToClipboard title="Copy Trace" content={result.trace.join("\n")} />
              ) : null}
            </>
          ) : (
            <>
              {isTimeoutError && onRetry ? (
                <Action title="Retry with Longer Timeout" icon={Icon.Repeat} onAction={onRetry} />
              ) : null}
              <Action.CopyToClipboard title="Copy Error" content={result.error} onCopy={() => popToRoot()} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

type DnsProvider = "cloudflare" | "google" | "quad9" | "opendns";

export default function Command() {
  const { push } = useNavigation();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const preferences = getPreferenceValues<Preferences>();
  const [provider, setProvider] = useState<DnsProvider>(preferences.dnsProvider);

  const maxRedirects = parseClampedInt(preferences.maxRedirects, 10, {
    min: 1,
    max: 50,
  });
  const timeout = parseClampedInt(preferences.timeout, 3000, {
    min: 250,
    max: 60000,
  });

  useEffect(() => {
    async function checkClipboard() {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          const trimmed = clipboardText.trim();
          if (looksLikeUrl(trimmed)) {
            setUrl(trimmed);
          }
        }
      } catch {
        // Clipboard access failed, ignore
      }
    }
    checkClipboard();
  }, []);

  async function handleSubmit(retryTimeout?: number) {
    const input = url.trim();
    if (!input) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a URL" });
      return;
    }

    if (!looksLikeUrl(input)) {
      showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      return;
    }

    setIsLoading(true);

    const useTimeout = retryTimeout ?? timeout;

    try {
      const result = await resolveUrl(input, maxRedirects, useTimeout, provider);

      if (result.error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: result.error,
        });
      } else {
        showToast({ style: Toast.Style.Success, title: "Resolved" });
      }

      const onRetry = () => {
        handleSubmit(timeout * 3);
      };

      push(<ResultsView result={result} onRetry={onRetry} />);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to resolve URL" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Resolve URL"
            icon={Icon.Link}
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={() => handleSubmit()}
          />
          <ActionPanel.Submenu
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Change DNS Provider…"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          >
            <Action
              title={`Cloudflare (1.1.1.1)${provider === "cloudflare" ? " ✓" : ""}`}
              icon={Icon.Globe}
              onAction={() => setProvider("cloudflare")}
            />
            <Action
              title={`Google (8.8.8.8)${provider === "google" ? " ✓" : ""}`}
              icon={Icon.Globe}
              onAction={() => setProvider("google")}
            />
            <Action
              title={`Quad9 (9.9.9.9)${provider === "quad9" ? " ✓" : ""}`}
              icon={Icon.Globe}
              onAction={() => setProvider("quad9")}
            />
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title={`OpenDNS (208.67.222.222)${provider === "opendns" ? " ✓" : ""}`}
              icon={Icon.Globe}
              onAction={() => setProvider("opendns")}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://bit.ly/example"
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.Dropdown
        id="provider"
        title="DNS Provider"
        value={provider}
        onChange={(value) => setProvider(value as DnsProvider)}
      >
        <Form.Dropdown.Item value="cloudflare" title="Cloudflare (1.1.1.1)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="google" title="Google (8.8.8.8)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="quad9" title="Quad9 (9.9.9.9)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="opendns" title="OpenDNS (208.67.222.222)" icon={Icon.Globe} />
      </Form.Dropdown>
    </Form>
  );
}
