import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ApiDetailView from "./api-detail";
import type { ApiConfig } from "./lib/types";
import { deleteConfig, getConfigs, saveConfig } from "./lib/storage";

function useConfigs() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setConfigs(await getConfigs());
    } catch (e) {
      setConfigs([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load API configs",
        message: e instanceof Error ? e.message : undefined,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { configs, isLoading, reload: load };
}

// ─── Form Component (create / edit) ──────────────────────────────

function ApiForm({ existingConfig, onSave }: { existingConfig?: ApiConfig; onSave: () => void }) {
  const { pop } = useNavigation();
  const isEdit = Boolean(existingConfig);

  async function handleSubmit(values: { name: string; baseUrl: string; accessToken: string; userId: string }) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (!values.baseUrl.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "API URL is required" });
      return;
    }

    const rawUrl = values.baseUrl.trim();
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "API URL is not a valid URL" });
      return;
    }
    if (parsed.protocol !== "https:") {
      await showToast({ style: Toast.Style.Failure, title: "API URL must use https://" });
      return;
    }
    if (parsed.username || parsed.password) {
      await showToast({ style: Toast.Style.Failure, title: "API URL must not contain userinfo (username@host)" });
      return;
    }
    if (!values.accessToken.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Access Token is required" });
      return;
    }
    if (!values.userId.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "User ID is required" });
      return;
    }

    // Strip userinfo + trailing slash, keep path/port intact
    parsed.username = "";
    parsed.password = "";
    const cleanUrl = parsed.href.replace(/\/+$/, "");

    const config: ApiConfig = {
      id: existingConfig?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: values.name.trim(),
      baseUrl: cleanUrl,
      accessToken: values.accessToken.trim(),
      userId: values.userId.trim(),
      createdAt: existingConfig?.createdAt ?? Date.now(),
    };

    try {
      await saveConfig(config, isEdit);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: e instanceof Error ? e.message : "Failed to save API",
      });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: "API saved" });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={isEdit ? "Edit API" : "Add API"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEdit ? "Edit API" : "Add API"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. My API" defaultValue={existingConfig?.name} autoFocus />
      <Form.TextField
        id="baseUrl"
        title="API URL"
        placeholder="https://www.newapi.ai"
        defaultValue={existingConfig?.baseUrl}
      />
      <Form.PasswordField
        id="accessToken"
        title="Access Token"
        placeholder="System access token"
        defaultValue={existingConfig?.accessToken}
      />
      <Form.TextField
        id="userId"
        title="User ID"
        placeholder="your id in this site"
        defaultValue={existingConfig?.userId}
      />
    </Form>
  );
}

// ─── Main List Command ────────────────────────────────────────────

export default function Command() {
  const { configs, isLoading, reload } = useConfigs();

  async function handleDelete(id: string) {
    const ok = await confirmAlert({ title: "Are you sure?" });
    if (!ok) return;
    await deleteConfig(id);
    await showToast({ style: Toast.Style.Success, title: "API deleted" });
    reload();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search APIs...">
      {configs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No APIs configured yet"
          description="Add one to get started"
          actions={
            <ActionPanel>
              <Action.Push title="Add API" target={<ApiForm onSave={reload} />} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}

      {configs.map((cfg) => (
        <List.Item
          key={cfg.id}
          icon={Icon.Globe}
          title={cfg.name}
          subtitle={cfg.baseUrl}
          accessories={[{ text: `#${cfg.userId}` }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Detail" target={<ApiDetailView config={cfg} />} icon={Icon.Eye} />
              <Action.Push
                title="Edit API"
                target={<ApiForm existingConfig={cfg} onSave={reload} />}
                icon={Icon.Pencil}
              />
              <Action
                title="Delete API"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(cfg.id)}
              />
              <Action.Push
                title="Add API"
                target={<ApiForm onSave={reload} />}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
