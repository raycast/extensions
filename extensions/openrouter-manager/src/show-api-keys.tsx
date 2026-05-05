import {
  List,
  getPreferenceValues,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Icon,
  Alert,
  confirmAlert,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { ApiKeyData } from "./types/types";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return dateStr;
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[] | undefined>();
  const [error, setError] = useState<Error>();

  const preferences = getPreferenceValues<Preferences>();

  async function getApiKeys() {
    setIsLoading(true);
    await fetch("https://openrouter.ai/api/v1/keys?include_disabled=true", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.management_key}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json() as Promise<{ data: ApiKeyData[] }>;
      })
      .then((body) => {
        setApiKeys(body.data);
      })
      .catch(() => {
        setError(new Error("Please ensure the management key is correct and try again."));
      });
    setIsLoading(false);
  }

  async function deleteApiKey(hash: string) {
    const options: Alert.Options = {
      title: "Delete API Key",
      message: "Are you sure you want to delete this API key?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      await fetch(`https://openrouter.ai/api/v1/keys/${hash}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${preferences.management_key}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
          getApiKeys();
          showToast({
            style: Toast.Style.Success,
            title: "API Key deleted successfully!",
          });
        })
        .catch((error) => {
          setError(error instanceof Error ? error : new Error(String(error)));
        });
    }
  }

  async function toggleApiKey(hash: string, current_state: boolean) {
    await fetch(`https://openrouter.ai/api/v1/keys/${hash}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${preferences.management_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ disabled: !current_state }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json() as Promise<{ key: string }>;
      })
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "API Key modified successfully!",
        });
        getApiKeys();
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
      });
  }

  useEffect(() => {
    getApiKeys();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Create New Key"
            icon={Icon.PlusCircle}
            onAction={() => launchCommand({ name: "create-api-key", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      {apiKeys && (
        <>
          <List.Section title="Enabled">
            {apiKeys
              .filter((apiKey: ApiKeyData) => !apiKey.disabled)
              .map((apiKey: ApiKeyData) => (
                <List.Item
                  title={apiKey.name}
                  key={apiKey.name}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          {/* General Info */}
                          <List.Item.Detail.Metadata.Label title="General Info" />
                          <List.Item.Detail.Metadata.Label title="Hash" text={apiKey.hash} />
                          <List.Item.Detail.Metadata.Label title="Name" text={apiKey.name} />
                          <List.Item.Detail.Metadata.Label title="Disabled" text={String(apiKey.disabled)} />
                          <List.Item.Detail.Metadata.Label title="Created at" text={formatDate(apiKey.created_at)} />
                          <List.Item.Detail.Metadata.Label title="Updated at" text={formatDate(apiKey.updated_at)} />
                          <List.Item.Detail.Metadata.Label title="Expires at" text={formatDate(apiKey.expires_at)} />
                          <List.Item.Detail.Metadata.Separator />

                          {/* Limit Info */}
                          <List.Item.Detail.Metadata.Label title="Limit Info" />
                          <List.Item.Detail.Metadata.Label title="Limit" text={String(apiKey.limit)} />
                          <List.Item.Detail.Metadata.Label
                            title="Limit remaining"
                            text={String(apiKey.limit_remaining)}
                          />
                          <List.Item.Detail.Metadata.Label title="Limit reset" text={String(apiKey.limit_reset)} />
                          <List.Item.Detail.Metadata.Label
                            title="Include BYOK in limit"
                            text={String(apiKey.include_byok_in_limit)}
                          />
                          <List.Item.Detail.Metadata.Separator />

                          {/* Usage Info */}
                          <List.Item.Detail.Metadata.Label title="Usage Info" />
                          <List.Item.Detail.Metadata.Label title="Usage" text={String(apiKey.usage)} />
                          <List.Item.Detail.Metadata.Label title="Usage daily" text={String(apiKey.usage_daily)} />
                          <List.Item.Detail.Metadata.Label title="Usage weekly" text={String(apiKey.usage_weekly)} />
                          <List.Item.Detail.Metadata.Label title="Usage monthly" text={String(apiKey.usage_monthly)} />
                          <List.Item.Detail.Metadata.Separator />

                          {/* BYOK Usage Info */}
                          <List.Item.Detail.Metadata.Label title="BYOK Usage Info" />
                          <List.Item.Detail.Metadata.Label title="BYOK usage" text={String(apiKey.byok_usage)} />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage daily"
                            text={String(apiKey.byok_usage_daily)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage weekly"
                            text={String(apiKey.byok_usage_weekly)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage monthly"
                            text={String(apiKey.byok_usage_monthly)}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard title="Copy Hash" content={apiKey.hash} />
                        <Action
                          title="Create New Key"
                          icon={Icon.PlusCircle}
                          onAction={() => launchCommand({ name: "create-api-key", type: LaunchType.UserInitiated })}
                        />
                        <Action
                          title="Edit Key"
                          icon={Icon.Pencil}
                          onAction={() =>
                            launchCommand({
                              name: "update-api-key",
                              type: LaunchType.UserInitiated,
                              arguments: { hash: apiKey.hash },
                            })
                          }
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action
                          title="Disable Key"
                          icon={Icon.Lock}
                          onAction={() => toggleApiKey(apiKey.hash, apiKey.disabled)}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                        />
                        <Action
                          title="Delete Key"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => deleteApiKey(apiKey.hash)}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowCounterClockwise}
                          onAction={() => getApiKeys()}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
          <List.Section title="Disabled">
            {apiKeys
              .filter((apiKey: ApiKeyData) => apiKey.disabled)
              .map((apiKey: ApiKeyData) => (
                <List.Item
                  title={apiKey.name}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          {/* General Info */}
                          <List.Item.Detail.Metadata.Label title="General Info" />
                          <List.Item.Detail.Metadata.Label title="Hash" text={apiKey.hash} />
                          <List.Item.Detail.Metadata.Label title="Name" text={apiKey.name} />
                          <List.Item.Detail.Metadata.Label title="Disabled" text={String(apiKey.disabled)} />
                          <List.Item.Detail.Metadata.Label title="Created at" text={formatDate(apiKey.created_at)} />
                          <List.Item.Detail.Metadata.Label title="Updated at" text={formatDate(apiKey.updated_at)} />
                          <List.Item.Detail.Metadata.Label title="Expires at" text={formatDate(apiKey.expires_at)} />
                          <List.Item.Detail.Metadata.Separator />

                          {/* Limit Info */}
                          <List.Item.Detail.Metadata.Label title="Limit Info" />
                          <List.Item.Detail.Metadata.Label title="Limit" text={String(apiKey.limit)} />
                          <List.Item.Detail.Metadata.Label
                            title="Limit remaining"
                            text={String(apiKey.limit_remaining)}
                          />
                          <List.Item.Detail.Metadata.Label title="Limit reset" text={String(apiKey.limit_reset)} />
                          <List.Item.Detail.Metadata.Label
                            title="Include BYOK in limit"
                            text={String(apiKey.include_byok_in_limit)}
                          />
                          <List.Item.Detail.Metadata.Separator />

                          {/* Usage Info */}
                          <List.Item.Detail.Metadata.Label title="Usage Info" />
                          <List.Item.Detail.Metadata.Label title="Usage" text={String(apiKey.usage)} />
                          <List.Item.Detail.Metadata.Label title="Usage daily" text={String(apiKey.usage_daily)} />
                          <List.Item.Detail.Metadata.Label title="Usage weekly" text={String(apiKey.usage_weekly)} />
                          <List.Item.Detail.Metadata.Label title="Usage monthly" text={String(apiKey.usage_monthly)} />
                          <List.Item.Detail.Metadata.Separator />

                          {/* BYOK Usage Info */}
                          <List.Item.Detail.Metadata.Label title="BYOK Usage Info" />
                          <List.Item.Detail.Metadata.Label title="BYOK usage" text={String(apiKey.byok_usage)} />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage daily"
                            text={String(apiKey.byok_usage_daily)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage weekly"
                            text={String(apiKey.byok_usage_weekly)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="BYOK usage monthly"
                            text={String(apiKey.byok_usage_monthly)}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard title="Copy Hash" content={apiKey.hash} />
                        <Action
                          title="Create New Key"
                          icon={Icon.PlusCircle}
                          onAction={() => launchCommand({ name: "create-api-key", type: LaunchType.UserInitiated })}
                        />
                        <Action
                          title="Edit Key"
                          icon={Icon.Pencil}
                          onAction={() =>
                            launchCommand({
                              name: "update-api-key",
                              type: LaunchType.UserInitiated,
                              arguments: { hash: apiKey.hash },
                            })
                          }
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action
                          title="Enable Key"
                          icon={Icon.LockUnlocked}
                          onAction={() => toggleApiKey(apiKey.hash, apiKey.disabled)}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                        />
                        <Action
                          title="Delete Key"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => deleteApiKey(apiKey.hash)}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowCounterClockwise}
                          onAction={() => getApiKeys()}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
