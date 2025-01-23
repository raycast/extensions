import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getAvatarIcon, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { neon } from "./neon";
import { formatDate } from "./utils";
import { OpenInNeon } from "./components";
import { ApiKeyCreateRequest } from "@neondatabase/api-client";
import { useState } from "react";

export default function ListAPIKeys() {
  const { isLoading, data, revalidate, mutate } = useCachedPromise(
    async () => {
      const res = await neon.listApiKeys();
      return res.data;
    },
    [],
    {
      initialData: [],
    },
  );

  const confirmAndRevoke = async (keyId: number) => {
    const options: Alert.Options = {
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      title: "Are you sure you want revoke this API key?",
      message: "Once revoked, any requests using this key will be denied. This action cannot be undone.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Revoke",
      },
    };

    if (await confirmAlert(options)) {
      await mutate(neon.revokeApiKey(keyId), {
        optimisticUpdate(data) {
          return data.filter((key) => key.id !== keyId);
        },
        shouldRevalidateAfter: false,
      });
    }
  };

  return (
    <List isLoading={isLoading}>
      {data.map((key) => (
        <List.Item
          key={key.id}
          icon={Icon.Key}
          title={key.name}
          accessories={[
            {
              icon: key.created_by.image || getAvatarIcon(key.created_by.name.split(" ")[0]),
              date: new Date(key.created_at),
              tooltip: `By ${key.created_by.name} on ${formatDate(key.created_at)}`,
            },
            { text: `Last used: ${key.last_used_at ? formatDate(key.last_used_at) : "never"}` },
          ]}
          actions={
            <ActionPanel>
              <OpenInNeon route="settings/api-keys" />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.Plus} title="Create API Key" target={<CreateAPIKey onCreate={revalidate} />} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
                title="Revoke Api Key"
                onAction={() => confirmAndRevoke(key.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateAPIKey({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<ApiKeyCreateRequest>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const res = await neon.createApiKey({ key_name: values.key_name });
        await Clipboard.copy(res.data.key);
        await showToast(Toast.Style.Success, `'${values.key_name}' created`, "Copied to Clipboard");
        onCreate();
        pop();
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      key_name: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Key name"
        placeholder="mykey"
        info="A user-specified API key name. This value is required when creating an API key."
        {...itemProps.key_name}
      />
    </Form>
  );
}
