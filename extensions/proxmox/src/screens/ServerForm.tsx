import { Action, ActionPanel, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import type { PveServer } from "@/types";
import { pveFetch } from "@/api";
import { describeFetchError } from "@/utils/errors";
import { serverNameFromUrl } from "@/utils/servers";

type ServerFormValues = {
  name: string;
  url: string;
  tokenId: string;
  tokenSecret: string;
};

type ServerFormProps = {
  server?: PveServer;
  onSave: (server: Omit<PveServer, "id">) => Promise<void>;
};

async function verifyConnection(server: PveServer): Promise<string | undefined> {
  try {
    await pveFetch(server, "api2/json/version", { signal: AbortSignal.timeout(5000) });
    return undefined;
  } catch (error) {
    return describeFetchError(error);
  }
}

export const ServerForm = ({ server, onSave }: ServerFormProps) => {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ServerFormValues>({
    initialValues: {
      name: server?.name ?? "",
      url: server?.url ?? "",
      tokenId: server?.tokenId ?? "",
      tokenSecret: server?.tokenSecret ?? "",
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "The item is required";
        }

        try {
          new URL(value);
        } catch {
          return "Enter a valid URL, e.g. https://pve.local:8006";
        }
      },
      tokenId: FormValidation.Required,
      tokenSecret: FormValidation.Required,
    },
    async onSubmit(values) {
      const candidate = {
        name: values.name.trim() || serverNameFromUrl(values.url),
        url: values.url,
        tokenId: values.tokenId,
        tokenSecret: values.tokenSecret,
      };

      const toast = await showToast({ style: Toast.Style.Animated, title: "Checking Connection..." });
      const connectionError = await verifyConnection({ ...candidate, id: server?.id ?? "unsaved" });
      await toast.hide();

      if (connectionError !== undefined) {
        const saveAnyway = await confirmAlert({
          title: "Connection Failed",
          message: `${candidate.url}\n${connectionError}\n\nSave the server anyway?`,
          primaryAction: { title: "Save Anyway" },
        });

        if (!saveAnyway) {
          return;
        }
      }

      await onSave(candidate);
      await showToast({ style: Toast.Style.Success, title: server ? "Server Updated" : "Server Added" });
      pop();
    },
  });

  return (
    <Form
      navigationTitle={server ? "Edit Server" : "Add Server"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={server ? "Save Server" : "Add Server"}
            icon={server ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.url}
        title="Server URL"
        placeholder="https://pve.local:8006"
        info="The URL of your Proxmox server, including the port"
      />
      <Form.TextField
        {...itemProps.tokenId}
        title="Token ID"
        placeholder="root@pam!raycast"
        info="The API token ID, see the extension README for how to create one"
      />
      <Form.PasswordField
        {...itemProps.tokenSecret}
        title="Token Secret"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      />
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Optional display name"
        info="Shown in lists to tell servers apart, defaults to the hostname of the URL"
      />
    </Form>
  );
};
