import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { detectProvider, fetchSnapshot } from "@/adapters";
import type { MonitoredSite } from "@/types";
import { normalizeSiteUrl } from "@/lib/url";

interface SiteFormValues {
  url: string;
  name: string;
}

interface SiteFormProps {
  site?: MonitoredSite;
  onSave: (values: {
    name: string;
    url: string;
    provider: MonitoredSite["provider"];
  }) => Promise<void>;
}

export function SiteForm({ site, onSave }: SiteFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: SiteFormValues) {
    setIsSubmitting(true);

    try {
      const url = normalizeSiteUrl(values.url);
      const provider = await detectProvider(url);
      const snapshot = await fetchSnapshot({ url, provider });

      if (snapshot.error) {
        throw new Error(snapshot.error);
      }

      const name = values.name.trim() || snapshot.pageName;

      await onSave({ name, url, provider });
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
        placeholder="https://status.claude.com"
        defaultValue={site?.url}
      />
      <Form.TextField
        id="name"
        title="Display Name"
        info="Optional — auto-filled from the status page if left empty"
        placeholder="Claude"
        defaultValue={site?.name}
      />
    </Form>
  );
}
