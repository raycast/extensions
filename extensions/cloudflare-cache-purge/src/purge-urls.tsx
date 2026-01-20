import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchZones,
  purgeUrls,
  Zone,
  showErrorToast,
  showSuccessToast,
  extractDomainFromUrl,
} from "./api";

export default function PurgeUrlsCommand() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    setIsLoading(true);
    try {
      const fetchedZones = await fetchZones();
      setZones(fetchedZones);
    } catch (err) {
      await showErrorToast(
        "Failed to load zones",
        err instanceof Error ? err : undefined,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusIcon(zone: Zone) {
    if (zone.paused) {
      return { source: Icon.Pause, tintColor: Color.Orange };
    }
    if (zone.status === "active") {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Select a zone to purge URLs from..."
    >
      <List.Section
        title="Select Zone"
        subtitle="Choose the site to purge URLs from"
      >
        {zones.map((zone) => (
          <List.Item
            key={zone.id}
            title={zone.name}
            subtitle={zone.id}
            icon={getStatusIcon(zone)}
            accessories={[
              {
                tag: {
                  value: zone.status,
                  color:
                    zone.status === "active"
                      ? Color.Green
                      : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Enter Urls to Purge"
                  icon={Icon.List}
                  onAction={() => push(<UrlInputForm zone={zone} />)}
                />
                <Action
                  title="Refresh Zones"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadZones}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface UrlInputFormProps {
  zone: Zone;
}

function UrlInputForm({ zone }: UrlInputFormProps) {
  const [urls, setUrls] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function validateUrls(value: string): string[] {
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    for (const line of lines) {
      try {
        const url = new URL(line);
        if (url.protocol === "http:" || url.protocol === "https:") {
          validUrls.push(line);
        } else {
          invalidUrls.push(line);
        }
      } catch {
        invalidUrls.push(line);
      }
    }

    if (invalidUrls.length > 0) {
      setUrlError(
        `Invalid URLs: ${invalidUrls.slice(0, 3).join(", ")}${invalidUrls.length > 3 ? "..." : ""}`,
      );
    } else {
      setUrlError(undefined);
    }

    return validUrls;
  }

  async function handleSubmit(values: { urls: string }) {
    const validUrls = validateUrls(values.urls);

    if (validUrls.length === 0) {
      setUrlError("Please enter at least one valid URL");
      return;
    }

    if (validUrls.length > 30) {
      setUrlError(
        "Maximum 30 URLs per request. Please reduce the number of URLs.",
      );
      return;
    }

    // Validate URLs belong to the zone
    const wrongDomainUrls = validUrls.filter((url) => {
      const domain = extractDomainFromUrl(url);
      if (!domain) return true;
      return !domain.endsWith(zone.name) && domain !== zone.name;
    });

    if (wrongDomainUrls.length > 0) {
      setUrlError(
        `Some URLs don't belong to ${zone.name}: ${wrongDomainUrls[0]}`,
      );
      return;
    }

    setIsSubmitting(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Purging URLs...",
      message: `${validUrls.length} URL(s)`,
    });

    try {
      await purgeUrls(zone.id, validUrls);
      await showSuccessToast(
        `Purged ${validUrls.length} URL(s) from ${zone.name}`,
      );
      pop();
    } catch (err) {
      await showErrorToast(
        "Failed to purge URLs",
        err instanceof Error ? err : undefined,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Purge Urls"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Zone" text={zone.name} />
      <Form.TextArea
        id="urls"
        title="URLs to Purge"
        placeholder={`https://${zone.name}/page-1\nhttps://${zone.name}/page-2\nhttps://${zone.name}/css/style.css`}
        info="Enter one URL per line. Maximum 30 URLs per request. URLs must include the full path including https://"
        value={urls}
        onChange={setUrls}
        error={urlError}
      />
      <Form.Description
        title="Tips"
        text="• Include query strings if the cached URL has them
• Use exact URLs as they appear in browser
• For cache tags or prefix purge, use Quick Purge command"
      />
    </Form>
  );
}
