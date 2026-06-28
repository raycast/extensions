import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listCaches, listCacheTypes, createCache, deleteCache } from "./api/caches";
import { Cache, CacheTypeOption } from "./types/cache";
import { getCacheStatusIcon } from "./utils/status-icons";
import { timeAgo } from "./utils/dates";
import { useState } from "react";

export default function ManageCaches() {
  const { data, isLoading, revalidate } = useCachedPromise(() => listCaches(), []);

  async function handleDelete(cache: Cache) {
    if (
      await confirmAlert({
        title: "Delete Cache",
        message: `Are you sure you want to delete "${cache.attributes.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting cache..." });
        await deleteCache(cache.id);
        await showToast({ style: Toast.Style.Success, title: "Cache deleted" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete cache", message: String(error) });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search caches...">
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Cache"
          actions={
            <ActionPanel>
              <Action.Push title="Create Cache" icon={Icon.Plus} target={<CreateCacheForm onCreated={revalidate} />} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Caches">
        {data?.data.map((cache) => {
          const statusIcon = getCacheStatusIcon(cache.attributes.status);
          return (
            <List.Item
              key={cache.id}
              icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
              title={cache.attributes.name}
              subtitle={cache.attributes.type}
              accessories={[
                { tag: { value: cache.attributes.region, color: Color.Blue } },
                { tag: { value: cache.attributes.size } },
                { tag: { value: cache.attributes.status, color: statusIcon.color } },
                { text: timeAgo(cache.attributes.created_at) },
              ]}
              actions={
                <ActionPanel>
                  {cache.attributes.connection.hostname && (
                    <Action.CopyToClipboard
                      title="Copy Hostname"
                      content={cache.attributes.connection.hostname}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  )}
                  {cache.attributes.connection.password && (
                    <Action.CopyToClipboard
                      title="Copy Password"
                      content={cache.attributes.connection.password}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    />
                  )}
                  <Action
                    title="Delete Cache"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(cache)}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateCacheForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: typesData, isLoading } = useCachedPromise(() => listCacheTypes(), []);

  const typeOptions = typesData?.data ?? [];
  const selectedTypeOption = typeOptions.find((t: CacheTypeOption) => t.type === selectedType);

  async function handleSubmit(values: Record<string, string | boolean>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating cache..." });
      await createCache({
        name: values.name,
        type: values.type,
        region: values.region,
        size: values.size,
        auto_upgrade_enabled: values.auto_upgrade_enabled,
        is_public: values.is_public,
      });
      await showToast({ style: Toast.Style.Success, title: "Cache created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create cache", message: String(error) });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Cache"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Cache" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-cache" />
      <Form.Dropdown id="type" title="Type" onChange={setSelectedType}>
        {typeOptions.map((t: CacheTypeOption) => (
          <Form.Dropdown.Item key={t.type} title={t.label} value={t.type} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="region" title="Region">
        {(selectedTypeOption?.regions ?? []).map((r: string) => (
          <Form.Dropdown.Item key={r} title={r} value={r} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="size" title="Size">
        {(selectedTypeOption?.sizes ?? []).map((s) => (
          <Form.Dropdown.Item key={s.value} title={s.label} value={s.value} />
        ))}
      </Form.Dropdown>
      {selectedTypeOption?.supports_auto_upgrade && (
        <Form.Checkbox id="auto_upgrade_enabled" label="Auto Upgrade Enabled" defaultValue={false} />
      )}
      <Form.Checkbox id="is_public" label="Publicly Accessible" defaultValue={false} />
    </Form>
  );
}
