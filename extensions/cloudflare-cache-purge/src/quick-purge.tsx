import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchZones,
  purgeUrls,
  Zone,
  showErrorToast,
  showSuccessToast,
  extractDomainFromUrl,
  findZoneByDomain,
  getDefaultZoneId,
} from "./api";

export default function QuickPurgeCommand() {
  const [url, setUrl] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [detectedZone, setDetectedZone] = useState<Zone | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (url && zones.length > 0) {
      detectZone(url);
    }
  }, [url, zones]);

  async function initialize() {
    setIsLoading(true);

    try {
      // Load zones
      const fetchedZones = await fetchZones();
      setZones(fetchedZones);

      // Set default zone if configured
      const defaultZoneId = getDefaultZoneId();
      if (defaultZoneId) {
        setSelectedZoneId(defaultZoneId);
      }

      // Check clipboard for URL
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        const trimmed = clipboardText.trim();
        if (isValidUrl(trimmed)) {
          setUrl(trimmed);

          // Try to detect zone from clipboard URL
          const domain = extractDomainFromUrl(trimmed);
          if (domain) {
            const zone = await findZoneByDomain(domain);
            if (zone) {
              setSelectedZoneId(zone.id);
              setDetectedZone(zone);
            }
          }
        }
      }
    } catch (err) {
      await showErrorToast(
        "Failed to initialize",
        err instanceof Error ? err : undefined,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function isValidUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function detectZone(urlValue: string) {
    if (!isValidUrl(urlValue)) {
      setDetectedZone(null);
      return;
    }

    const domain = extractDomainFromUrl(urlValue);
    if (!domain) {
      setDetectedZone(null);
      return;
    }

    const zone = zones.find(
      (z) => domain.endsWith(z.name) || domain === z.name,
    );
    if (zone && zone.id !== selectedZoneId) {
      setDetectedZone(zone);
      setSelectedZoneId(zone.id);
    } else if (!zone) {
      setDetectedZone(null);
    }
  }

  function validateUrl(value: string): boolean {
    if (!value.trim()) {
      setUrlError("URL is required");
      return false;
    }

    if (!isValidUrl(value)) {
      setUrlError("Please enter a valid URL starting with http:// or https://");
      return false;
    }

    setUrlError(undefined);
    return true;
  }

  async function handleSubmit(values: { url: string; zoneId: string }) {
    if (!validateUrl(values.url)) {
      return;
    }

    if (!values.zoneId) {
      await showErrorToast("Please select a zone");
      return;
    }

    const zone = zones.find((z) => z.id === values.zoneId);
    if (!zone) {
      await showErrorToast("Invalid zone selected");
      return;
    }

    // Validate URL belongs to zone
    const domain = extractDomainFromUrl(values.url);
    if (domain && !domain.endsWith(zone.name) && domain !== zone.name) {
      setUrlError(`URL domain (${domain}) doesn't match zone (${zone.name})`);
      return;
    }

    setIsSubmitting(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Purging URL...",
    });

    try {
      await purgeUrls(values.zoneId, [values.url.trim()]);
      await showSuccessToast(`Purged: ${values.url}`);
      await popToRoot();
    } catch (err) {
      await showErrorToast(
        "Failed to purge URL",
        err instanceof Error ? err : undefined,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Purge URL"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text && isValidUrl(text.trim())) {
                setUrl(text.trim());
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL to Purge"
        placeholder="https://example.com/page-to-purge"
        value={url}
        onChange={(value) => {
          setUrl(value);
          if (value) validateUrl(value);
        }}
        error={urlError}
        info="The exact URL to remove from Cloudflare's cache"
      />

      <Form.Dropdown
        id="zoneId"
        title="Zone"
        value={selectedZoneId}
        onChange={setSelectedZoneId}
        info={
          detectedZone
            ? `Auto-detected: ${detectedZone.name}`
            : "Select the Cloudflare zone for this URL"
        }
      >
        <Form.Dropdown.Item value="" title="Select a zone..." />
        {zones.map((zone) => (
          <Form.Dropdown.Item
            key={zone.id}
            value={zone.id}
            title={zone.name}
            icon={
              zone.status === "active"
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
          />
        ))}
      </Form.Dropdown>

      {detectedZone && (
        <Form.Description
          title="Auto-detected"
          text={`Zone "${detectedZone.name}" was automatically selected based on the URL domain.`}
        />
      )}

      <Form.Description
        title="Notes"
        text="• URL must include the full path (https://...)
• Include query strings if the cached version has them
• Changes take effect within seconds globally"
      />
    </Form>
  );
}
