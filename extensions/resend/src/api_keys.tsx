import { useState } from "react";
import { CreateAPIKeyRequestForm } from "./utils/types";
import { isApiError } from "./utils/api";
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
import { onError, useGetAPIKeys, useGetDomains } from "./lib/hooks";
import { resend } from "./lib/resend";
import { ApiKey, CreateApiKeyOptions } from "resend";

export default function APIKeys() {
  const { isLoading, keys, error, revalidate, mutate } = useGetAPIKeys();

  async function confirmAndDelete(item: ApiKey) {
    if (
      await confirmAlert({
        title: `Delete '${item.name}'?`,
        message: `id: ${item.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting API Key", item.name);
      try {
        await mutate(
          resend.apiKeys.remove(item.id).then(({ error }) => {
            if (error) throw new Error(error.message, { cause: error.name });
          }),
          {
            optimisticUpdate(data) {
              return data.filter((k) => k.id !== item.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted API Key";
      } catch (error) {
        onError(error as Error);
      }
    }
  }

  const numOfKeys = keys.length;
  const title = `${numOfKeys} ${numOfKeys === 1 ? "API Key" : "API Keys"}`;
  return error && isApiError(error) ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search key">
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
                  <Action.Push
                    title="Create New API Key"
                    icon={Icon.Plus}
                    target={<APIKeysCreate onKeyCreated={revalidate} />}
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
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New API Key"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New API Key"
                  icon={Icon.Plus}
                  target={<APIKeysCreate onKeyCreated={revalidate} />}
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

      const newKey: CreateApiKeyOptions = {
        ...values,
        permission: values.permission === "full_access" ? "full_access" : "sending_access",
      };
      if (newKey.domain_id === "all") delete newKey.domain_id;

      try {
        const { error, data } = await resend.apiKeys.create(newKey);
        if (error) throw new Error(error.message, { cause: error.name });
        showToast(Toast.Style.Success, "Created API Key", data.token);
        if (
          await confirmAlert({
            title: "Copy Token?",
            message: "YOU WILL NOT BE ABLE TO SEE THE TOKEN AGAIN.",
            primaryAction: { title: "Copy" },
          })
        ) {
          await Clipboard.copy(data.token);
        }
        onKeyCreated();
        pop();
      } catch (error) {
        onError(error as Error);
      } finally {
        setIsLoading(false);
      }
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
