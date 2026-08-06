import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import { Group } from "../lib/Groups";
import { createNewPins, getPins } from "../lib/Pins";
import { Visibility } from "../lib/constants";

type BulkImportUrlsFormProps = {
  group: Group;
  onImported: () => Promise<void>;
};

const normalizeUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol != "http:" && url.protocol != "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const titleFromUrl = (url: string) => {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./, "");
  const pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
  const title = pathname ? `${hostname}/${pathname}` : hostname;
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
};

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
              const uniqueUrls = [...new Set(normalized.filter((url): url is string => url != undefined))];
              const storedPins = await getPins();
              const existingUrls = new Set(
                storedPins.filter((pin) => pin.group == group.name).map((pin) => normalizeUrl(pin.url) || pin.url),
              );
              const newUrls = uniqueUrls.filter((url) => !existingUrls.has(url));
              const duplicateCount =
                uniqueUrls.length - newUrls.length + (normalized.length - invalidCount - uniqueUrls.length);

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
