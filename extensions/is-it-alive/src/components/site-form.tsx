import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectProvider, fetchSnapshot } from "@/adapters";
import type { MonitoredSite } from "@/types";
import {
  cloudProviderFromSiteProvider,
  sanitizeMonitoredRegions,
} from "@/lib/region-catalog";
import { isCloudProvider } from "@/lib/regions";
import { normalizeSiteUrl } from "@/lib/url";
import type { SiteInput } from "@/hooks/use-sites";
import { RegionFilterFields } from "@/components/region-filter-form";

interface SiteFormValues {
  url: string;
  name: string;
  monitoredRegions: string[];
}

interface SiteFormProps {
  site?: MonitoredSite;
  onSave: (values: SiteInput) => Promise<void>;
}

export function SiteForm({ site, onSave }: SiteFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [url, setUrl] = useState(site?.url ?? "");
  const [name, setName] = useState(site?.name ?? "");
  const [provider, setProvider] = useState<MonitoredSite["provider"] | null>(
    site?.provider ?? null,
  );
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) {
        clearTimeout(detectTimerRef.current);
      }
    };
  }, []);

  const activeProvider = provider ?? site?.provider ?? null;
  const cloudProvider = activeProvider
    ? cloudProviderFromSiteProvider(activeProvider)
    : null;

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);

    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
    }

    if (!value.trim()) {
      setProvider(null);
      return;
    }

    detectTimerRef.current = setTimeout(async () => {
      try {
        setProvider(await detectProvider(normalizeSiteUrl(value)));
      } catch {
        setProvider(null);
      }
    }, 600);
  }, []);

  async function handleSubmit(values: SiteFormValues) {
    setIsSubmitting(true);

    try {
      const url = normalizeSiteUrl(values.url);
      const detectedProvider = await detectProvider(url);
      const detectedCloudProvider =
        cloudProviderFromSiteProvider(detectedProvider);
      const monitoredRegions = detectedCloudProvider
        ? sanitizeMonitoredRegions(
            detectedCloudProvider,
            values.monitoredRegions,
          )
        : undefined;
      const snapshot = await fetchSnapshot({
        url,
        provider: detectedProvider,
        monitoredRegions,
      });

      if (snapshot.error) {
        throw new Error(snapshot.error);
      }

      const name = values.name.trim() || snapshot.pageName;

      await onSave({
        name,
        url,
        provider: detectedProvider,
        monitoredRegions,
      });
      await showToast({
        style: Toast.Style.Success,
        title: site ? "Site updated" : "Site added",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: site ? "Failed to update site" : "Failed to add site",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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
            title={site ? "Save Site" : "Add Site"}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Status Page URL"
        placeholder="https://health.aws.amazon.com/health/status"
        value={url}
        onChange={handleUrlChange}
      />
      <Form.TextField
        id="name"
        title="Display Name"
        info="Optional — auto-filled from the status page if left empty"
        placeholder="AWS"
        value={name}
        onChange={setName}
      />
      {cloudProvider && isCloudProvider(activeProvider!) && (
        <RegionFilterFields
          provider={cloudProvider}
          monitoredRegions={site?.monitoredRegions}
        />
      )}
    </Form>
  );
}
