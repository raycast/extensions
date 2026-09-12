import { List, Action, ActionPanel, Icon, Form, Detail } from "@raycast/api";

import { useEffect, useState } from "react";

import { useAPITokens } from "./hooks";
import { createAPIToken, revokeAPIToken } from "./utils/api";

export default function APITokenView() {
  const [isLoading, setIsLoading] = useState(false);
  const { data, revalidate, isLoading: isFetchLoading } = useAPITokens();

  useEffect(() => {
    setIsLoading(isFetchLoading);
  }, [isFetchLoading]);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Create API Token..."
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action.Push title="Create" target={<NewAPITokenView />} />
          </ActionPanel>
        }
      />
      {data.map((token) => (
        <List.Item
          key={token.id}
          title={token.name}
          subtitle={token.id}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Key Name" content={token.name} />
              <Action
                title="Delete API Key"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  setIsLoading(true);
                  await revokeAPIToken(token.name);
                  await revalidate();
                  setIsLoading(false);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function jsonMarkdown(json: Record<string, unknown>) {
  return `\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``;
}

function NewAPITokenView() {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<Record<string, unknown> | null>(null);

  return token ? (
    <Detail
      markdown={jsonMarkdown(token)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={JSON.stringify(token.token, null, 2)} />
        </ActionPanel>
      }
    />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            onSubmit={async (values: { name: string }) => {
              setIsLoading(true);
              const token = await createAPIToken(values.name);
              setToken(token);
              setIsLoading(false);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" />
    </Form>
  );
}
