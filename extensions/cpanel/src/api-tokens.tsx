import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useListAPITokens, useUAPI } from "./lib/hooks";
import { formatDate, isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import { APIToken } from "./lib/types";
import { revokeAPIToken } from "./lib/api";

export default function APITokens() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading, data, revalidate } = useListAPITokens();

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search api token">
      {data?.map((token) => (
        <List.Item
          key={token.name}
          title={token.name}
          icon={Icon.Key}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {token.has_full_access ? (
                    <List.Item.Detail.Metadata.Label title="Features" text="ALL" />
                  ) : (
                    <List.Item.Detail.Metadata.TagList title="Features">
                      {token.features.map((feature) => (
                        <List.Item.Detail.Metadata.TagList.Item key={feature} text={feature} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Has Full Access"
                    icon={token.has_full_access ? Icon.Check : Icon.Xmark}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Created"
                    text={formatDate(new Date(token.create_time * 1000))}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Expires"
                    text={!token.expires_at ? "Never" : formatDate(new Date(token.expires_at * 1000))}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Create API Token"
                target={<CreateAPIToken onTokenCreated={revalidate} />}
              />
              <Action
                icon={Icon.Trash}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Revoke API Token"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Revoke API Token?",
                    message: token.name,
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Revoke",
                      onAction() {
                        revokeAPIToken(token.name).then(revalidate);
                      },
                    },
                  })
                }
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateAPIToken({ onTokenCreated }: { onTokenCreated: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  type FormValues = {
    name: string;
  };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  const { isLoading } = useUAPI<Partial<APIToken>>("Tokens", "create_full_access", values, {
    execute,
    onError() {
      setExecute(false);
    },
    async onData() {
      await showToast({
        title: `Created api token`,
      });
      onTokenCreated();
      pop();
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="API Token Name"
        placeholder="Enter the API token name."
        info="The name of the token that you are creating. Enter a descriptive name. You will use this name when you update the token via API."
        {...itemProps.name}
      />
      <Form.Description text="API token names can be alpha-numeric and can contain dashes and underscores." />
    </Form>
  );
}
