import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import { Group } from "../lib/Groups";
import { createNewPins, getPins } from "../lib/Pins";
import { Visibility } from "../lib/constants";
import { hasURLScheme } from "../lib/utils";

type BulkImportUrlsFormProps = {
  group: Group;
  onImported: () => Promise<void>;
};

/**
 * Normalizes a URL while preserving any explicit URL scheme supported by Pins.
 * @param input The URL to normalize.
 * @returns The normalized URL, or undefined if the value is invalid.
 */
const normalizeUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const looksLikeHostWithPort = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[^/:\s]+\.[^/:\s]+):\d+(?:[/?#]|$)/i.test(
    trimmed,
  );
  const candidate = hasURLScheme(trimmed) && !looksLikeHostWithPort ? trimmed : `https://${trimmed}`;
  try {
    new URL(candidate.replace(/{{[\s\S]*}}/g, "pins-placeholder"));
    return candidate;
  } catch {
    return undefined;
  }
};

/**
 * Produces a canonical key for URL comparisons without changing the stored URL.
 * @param url The URL to canonicalize.
 * @returns A canonical comparison key, or undefined if the URL is invalid.
 */
const canonicalizeUrl = (url: string) => {
  const normalized = normalizeUrl(url);
  if (!normalized) return undefined;
  if (normalized.includes("{{")) return `placeholder:${normalized}`;

  try {
    return new URL(normalized).toString();
  } catch {
    return normalized;
  }
};

/**
 * Creates a concise default pin title from a URL.
 * @param url The normalized URL.
 * @returns A title of at most 80 characters.
 */
const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const encodedPathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
    const pathname = decodeURI(encodedPathname);
    const title = hostname ? (pathname ? `${hostname}/${pathname}` : hostname) : `${parsed.protocol}${pathname}`;
    return title.length > 80 ? `${title.slice(0, 77)}...` : title;
  } catch {
    return url.length > 80 ? `${url.slice(0, 77)}...` : url;
  }
};

/**
 * Form for importing newline-separated URLs into a group.
 * @param props.group The target group.
 * @param props.onImported The function to call after importing pins.
 * @returns A form view.
 */
export default function BulkImportUrlsForm({ group, onImported }: BulkImportUrlsFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Import URLs into ${group.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import URLs"
            icon={Icon.Download}
            onSubmit={async (values) => {
              const lines = String(values.urls || "")
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

              if (lines.length == 0) {
                await showToast({ style: Toast.Style.Failure, title: "No URLs provided" });
                return;
              }

              const normalized = lines.map(normalizeUrl);
              const invalidCount = normalized.filter((url) => url == undefined).length;
              const uniqueUrls = new Map<string, string>();
              for (const url of normalized) {
                if (!url) continue;
                const canonicalUrl = canonicalizeUrl(url);
                if (canonicalUrl && !uniqueUrls.has(canonicalUrl)) uniqueUrls.set(canonicalUrl, url);
              }

              const storedPins = await getPins();
              const existingUrls = new Set(
                storedPins
                  .filter((pin) => pin.group == group.name)
                  .map((pin) => canonicalizeUrl(pin.url))
                  .filter((url): url is string => url != undefined),
              );
              const newUrls = [...uniqueUrls.entries()]
                .filter(([canonicalUrl]) => !existingUrls.has(canonicalUrl))
                .map(([, url]) => url);
              const duplicateCount = normalized.length - invalidCount - newUrls.length;

              if (newUrls.length == 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "No new URLs to import",
                  message:
                    invalidCount > 0 ? `${invalidCount} invalid URL${invalidCount == 1 ? "" : "s"} skipped` : undefined,
                });
                return;
              }

              await createNewPins(
                newUrls.map((url) => ({
                  name: titleFromUrl(url),
                  url,
                  icon: "Favicon / File Icon",
                  group: group.name,
                  application: "None",
                  visibility: Visibility.USE_PARENT,
                })),
              );
              await onImported();

              const details = [
                invalidCount > 0 ? `${invalidCount} invalid skipped` : undefined,
                duplicateCount > 0 ? `${duplicateCount} duplicate${duplicateCount == 1 ? "" : "s"} skipped` : undefined,
              ].filter(Boolean);

              await showToast({
                style: Toast.Style.Success,
                title: `Imported ${newUrls.length} pin${newUrls.length == 1 ? "" : "s"}`,
                message: details.length > 0 ? details.join("; ") : undefined,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="urls" title="URLs" placeholder="Paste one URL per line..." autoFocus />
      <Form.Description text="Missing schemes are treated as HTTPS. Invalid and duplicate URLs are skipped." />
    </Form>
  );
}
