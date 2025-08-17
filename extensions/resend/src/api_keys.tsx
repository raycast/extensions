import { useEffect, useState } from "react";
import { APIKey, CreateAPIKeyRequest, CreateAPIKeyRequestForm } from "./utils/types";
import { createApiKey, deleteApiKey } from "./utils/api";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { CREATE_API_KEY_PERMISSIONS, RESEND_URL } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";
import { useGetAPIKeys, useGetDomains } from "./lib/hooks";

export default function APIKeys() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { isLoading: isLoadingKeys, keys, error: errorKeys, revalidate } = useGetAPIKeys();

  useEffect(() => {
    if (!errorKeys) return;
    if (errorKeys.cause === "validation_error" || errorKeys.cause === "restricted_api_key") {
      setError(errorKeys.message);
    }
  }, [errorKeys]);

  async function confirmAndDelete(item: APIKey) {
    if (
      await confirmAlert({
        title: `Delete '${item.name}'?`,
        message: `id: ${item.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteApiKey(item.id);
      if (!("statusCode" in response)) {
        await showToast(Toast.Style.Success, "Deleted API Key");
        revalidate();
      }
      setIsLoading(false);
    }
  }

  const numOfKeys = keys.length;
  const title = `${numOfKeys} ${numOfKeys === 1 ? "API Key" : "API Keys"}`;
  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading || isLoadingKeys} searchBarPlaceholder="Search key">
      <List.Section title={title}>
        {keys.map((item) => (
          <List.Item
            key={item.id}
            title={item.name || "<NO_NAME>"}
            icon={Icon.Key}
            subtitle={item.id}
            accessories={[{ tag: new Date(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID to Clipboard" content={item.id} />
                <Action.CopyToClipboard title="Copy Name to Clipboard" content={item.name} />
                <Action
                  title="Delete API Key"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(item)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Create New API Key"
                    icon={Icon.Plus}
                    onAction={() => push(<APIKeysCreate onKeyCreated={revalidate} />)}
                  />
                  <Action title="Reload API Keys" icon={Icon.Redo} onAction={revalidate} />
                  <Action.OpenInBrowser
                    title="View API Reference"
                    url={`${RESEND_URL}docs/api-reference/api-keys/list-api-keys`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && !isLoadingKeys && (
        <List.Section title="Actions">
          <List.Item
            title="Create New API Key"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create New API Key"
                  icon={Icon.Plus}
                  onAction={() => push(<APIKeysCreate onKeyCreated={revalidate} />)}
                />
                <Action.OpenInBrowser
                  title="View API Reference"
                  url={`${RESEND_URL}docs/api-reference/api-keys/create-api-key`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload API Keys"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload API Keys" icon={Icon.Redo} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type APIKeysCreateProps = {
  onKeyCreated: () => void;
};
function APIKeysCreate({ onKeyCreated }: APIKeysCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateAPIKeyRequestForm>({
    async onSubmit(values) {
      setIsLoading(true);

      const newKey: CreateAPIKeyRequest = {
        ...values,
        permission: values.permission === "full_access" ? "full_access" : "sending_access",
      };
      if (newKey.domain_id === "all") delete newKey.domain_id;

      const response = await createApiKey(newKey);
      if (!("statusCode" in response)) {
        showToast(Toast.Style.Success, "Created API Key", response.token);
        if (
          await confirmAlert({
            title: "Copy Token?",
            message: "YOU WILL NOT BE ABLE TO SEE THE TOKEN AGAIN.",
            primaryAction: { title: "Copy" },
          })
        ) {
          await Clipboard.copy(response.token);
        }
        onKeyCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  const { isLoading: isLoadingDomains, domains } = useGetDomains();

  return (
    <Form
      isLoading={isLoading || isLoadingDomains}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="View API Reference"
            url={`${RESEND_URL}docs/api-reference/api-keys/create-api-key`}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Dropdown title="Permission" {...itemProps.permission}>
        {CREATE_API_KEY_PERMISSIONS.map((permission) => (
          <Form.Dropdown.Item title={permission.title} key={permission.title} value={permission.value} />
        ))}
      </Form.Dropdown>
      <Form.Description
        text={CREATE_API_KEY_PERMISSIONS.map((permission) => permission.title + ": " + permission.description).join(
          `\n`,
        )}
      />

      <Form.Dropdown
        title="Allowed Domain"
        info="Restrict an API key to send emails only from a specific domain. Only used when the 'permission' is 'sending_access'."
        {...itemProps.domain_id}
      >
        <Form.Dropdown.Item title="All domains" value="all" />
        {domains.map((domainItem) => (
          <Form.Dropdown.Item
            key={domainItem.id}
            title={domainItem.name}
            icon={getFavicon(`https://${domainItem.name}`, { fallback: Icon.Globe })}
            value={domainItem.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
