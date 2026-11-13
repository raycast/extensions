import { Form, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import { getServices, purgeUrl, purgeSurrogateKeys, purgeCache } from "../api";
import { useForm } from "@raycast/utils";

type PurgeType = "url" | "keys" | "all";

// Dropdown values are typed at the definition site, so the casts below can't
// drift from the rendered options.
const PURGE_OPTIONS: Array<{ value: PurgeType; title: string; icon: Icon }> = [
  { value: "url", title: "Single URL", icon: Icon.Link },
  { value: "keys", title: "Surrogate Keys", icon: Icon.Tag },
  { value: "all", title: "Everything on a Service", icon: Icon.Trash },
];

interface PurgeFormValues {
  purgeType: string;
  url: string;
  keys: string;
  serviceId: string;
  soft: boolean;
}

export function PurgeForm() {
  const [services, setServices] = useState<FastlyService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        setServices(await getServices());
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load services",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadServices();
  }, []);

  const { handleSubmit, itemProps, values, reset } = useForm<PurgeFormValues>({
    async onSubmit(formValues) {
      const purgeType = formValues.purgeType as PurgeType;
      const serviceName = services.find((service) => service.id === formValues.serviceId)?.name;

      if (purgeType === "all") {
        const confirmed = await confirmAlert({
          title: "Purge Everything",
          message: `Purge the entire cache for "${serviceName}"? All cached content will be fetched from origin again, which can significantly increase origin load.`,
          primaryAction: { title: "Purge All", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) {
          return;
        }
      }

      try {
        setIsLoading(true);
        if (purgeType === "url") {
          await purgeUrl(formValues.url.trim(), formValues.soft);
          await showToast({
            style: Toast.Style.Success,
            title: formValues.soft ? "URL soft-purged" : "URL purged",
            message: formValues.url.trim(),
          });
        } else if (purgeType === "keys") {
          const keys = formValues.keys
            .split(/[\s,]+/)
            .map((key) => key.trim())
            .filter(Boolean);
          await purgeSurrogateKeys(formValues.serviceId, keys, formValues.soft);
          await showToast({
            style: Toast.Style.Success,
            title: formValues.soft ? "Keys soft-purged" : "Keys purged",
            message: `${keys.length} ${keys.length === 1 ? "key" : "keys"} on ${serviceName}`,
          });
        } else {
          await purgeCache(formValues.serviceId);
          await showToast({ style: Toast.Style.Success, title: "Cache purged", message: serviceName });
        }
        reset({ purgeType: formValues.purgeType, serviceId: formValues.serviceId, url: "", keys: "", soft: false });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Purge failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      purgeType: "url",
      url: "",
      keys: "",
      serviceId: "",
      soft: false,
    },
    validation: {
      url: (url) => {
        if (values.purgeType !== "url") return;
        if (!url?.trim()) return "Enter the URL to purge";
        if (!/^\S+\.\S+/.test(url.trim())) return "Enter a full URL like example.com/path";
      },
      keys: (keys) => {
        if (values.purgeType === "keys" && !keys?.trim()) {
          return "Enter one or more surrogate keys";
        }
      },
      serviceId: (serviceId) => {
        if (values.purgeType !== "url" && !serviceId) {
          return "Select a service";
        }
      },
    },
  });

  const purgeType = values.purgeType as PurgeType;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={purgeType === "all" ? "Purge Everything" : purgeType === "keys" ? "Purge Keys" : "Purge URL"}
            icon={Icon.Trash}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Purge" {...itemProps.purgeType}>
        {PURGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>

      {purgeType === "url" && (
        <Form.TextField
          title="URL"
          placeholder="www.example.com/path/to/page"
          info="The exact cached URL, with or without the scheme"
          {...itemProps.url}
        />
      )}

      {purgeType !== "url" && (
        <Form.Dropdown title="Service" {...itemProps.serviceId}>
          {services.map((service) => (
            <Form.Dropdown.Item key={service.id} value={service.id} title={service.name} />
          ))}
        </Form.Dropdown>
      )}

      {purgeType === "keys" && (
        <Form.TextField
          title="Surrogate Keys"
          placeholder="key1 key2 key3"
          info="One or more surrogate keys, separated by spaces or commas"
          {...itemProps.keys}
        />
      )}

      {purgeType !== "all" && (
        <Form.Checkbox
          label="Soft purge"
          info="Marks content as stale instead of removing it, so it can still be served while revalidating"
          {...itemProps.soft}
        />
      )}
    </Form>
  );
}
