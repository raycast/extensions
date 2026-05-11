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
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listBuckets,
  createBucket,
  deleteBucket,
  listBucketKeys,
  createBucketKey,
  deleteBucketKey,
} from "./api/buckets";
import { Bucket, BucketKey } from "./types/bucket";
import { getBucketStatusIcon } from "./utils/status-icons";
import { timeAgo } from "./utils/dates";

export default function ManageBuckets() {
  const { data, isLoading, revalidate } = useCachedPromise(() => listBuckets(), []);

  async function handleDelete(bucket: Bucket) {
    if (
      await confirmAlert({
        title: "Delete Bucket",
        message: `Are you sure you want to delete "${bucket.attributes.name}"? This action cannot be undone.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting bucket..." });
        await deleteBucket(bucket.id);
        await showToast({ style: Toast.Style.Success, title: "Bucket deleted" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete bucket", message: String(error) });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search buckets...">
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Bucket"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Bucket"
                icon={Icon.Plus}
                target={<CreateBucketForm onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Buckets">
        {data?.data.map((bucket) => {
          const statusIcon = getBucketStatusIcon(bucket.attributes.status);
          return (
            <List.Item
              key={bucket.id}
              icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
              title={bucket.attributes.name}
              accessories={[
                { tag: { value: bucket.attributes.visibility } },
                { tag: { value: bucket.attributes.jurisdiction } },
                { tag: { value: bucket.attributes.status, color: statusIcon.color } },
                { text: timeAgo(bucket.attributes.created_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Keys" icon={Icon.Key} target={<BucketKeysDetail bucket={bucket} />} />
                  {bucket.attributes.endpoint && (
                    <Action.CopyToClipboard
                      title="Copy Endpoint"
                      content={bucket.attributes.endpoint}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  )}
                  {bucket.attributes.url && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={bucket.attributes.url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    />
                  )}
                  <Action
                    title="Delete Bucket"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(bucket)}
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

function BucketKeysDetail({ bucket }: { bucket: Bucket }) {
  const { data: keysData, isLoading, revalidate } = useCachedPromise((id: string) => listBucketKeys(id), [bucket.id]);

  async function handleDeleteKey(key: BucketKey) {
    if (
      await confirmAlert({
        title: "Delete Key",
        message: `Are you sure you want to delete "${key.attributes.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting key..." });
        await deleteBucketKey(bucket.id, key.id);
        await showToast({ style: Toast.Style.Success, title: "Key deleted" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete key", message: String(error) });
      }
    }
  }

  return (
    <List
      navigationTitle={`${bucket.attributes.name} - Keys`}
      isLoading={isLoading}
      searchBarPlaceholder="Search keys..."
    >
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Key"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Key"
                icon={Icon.Plus}
                target={<CreateBucketKeyForm bucketId={bucket.id} onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Keys">
        {keysData?.data.map((key) => (
          <List.Item
            key={key.id}
            icon={Icon.Key}
            title={key.attributes.name}
            subtitle={key.attributes.permission}
            accessories={[
              key.attributes.access_key_id ? { text: key.attributes.access_key_id } : {},
              { text: timeAgo(key.attributes.created_at) },
            ]}
            actions={
              <ActionPanel>
                {key.attributes.access_key_id && (
                  <Action.CopyToClipboard
                    title="Copy Access Key ID"
                    content={key.attributes.access_key_id}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
                {key.attributes.access_key_secret && (
                  <Action.CopyToClipboard
                    title="Copy Access Key Secret"
                    content={key.attributes.access_key_secret}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                )}
                <Action
                  title="Delete Key"
                  icon={Icon.Trash}
                  onAction={() => handleDeleteKey(key)}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreateBucketForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, string>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating bucket..." });
      await createBucket({
        name: values.name,
        visibility: values.visibility,
        jurisdiction: values.jurisdiction,
        key_name: values.key_name || undefined,
        key_permission: values.key_permission || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Bucket created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create bucket", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Create Bucket"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Bucket" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-bucket" />
      <Form.Dropdown id="visibility" title="Visibility">
        <Form.Dropdown.Item title="Private" value="private" />
        <Form.Dropdown.Item title="Public" value="public" />
      </Form.Dropdown>
      <Form.Dropdown id="jurisdiction" title="Jurisdiction">
        <Form.Dropdown.Item title="Default" value="default" />
        <Form.Dropdown.Item title="EU" value="eu" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="key_name" title="Initial Key Name" placeholder="my-key (optional)" />
      <Form.Dropdown id="key_permission" title="Key Permission">
        <Form.Dropdown.Item title="Read/Write" value="read_write" />
        <Form.Dropdown.Item title="Read Only" value="read_only" />
      </Form.Dropdown>
    </Form>
  );
}

function CreateBucketKeyForm({ bucketId, onCreated }: { bucketId: string; onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; permission: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating key..." });
      await createBucketKey(bucketId, { name: values.name, permission: values.permission });
      await showToast({ style: Toast.Style.Success, title: "Key created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create key", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Create Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-key" />
      <Form.Dropdown id="permission" title="Permission">
        <Form.Dropdown.Item title="Read/Write" value="read_write" />
        <Form.Dropdown.Item title="Read Only" value="read_only" />
      </Form.Dropdown>
    </Form>
  );
}
