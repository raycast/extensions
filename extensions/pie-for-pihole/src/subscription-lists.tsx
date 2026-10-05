import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export function AddListForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { address: string; type: string }) {
    if (!values.address.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No address provided",
      });
      return;
    }

    setIsSubmitting(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Adding subscription list...",
    });

    try {
      const api = getPiholeAPI();
      await api.addSubscriptionList(values.address.trim(), values.type as "allow" | "block");
      await showToast({
        style: Toast.Style.Success,
        title: "Subscription list added",
      });
      onSuccess?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add list",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Subscription List"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add List" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="https://example.com/blocklist.txt"
        info="URL of the subscription list"
      />
      <Form.Dropdown id="type" title="Type" defaultValue="block">
        <Form.Dropdown.Item value="block" title="Block" />
        <Form.Dropdown.Item value="allow" title="Allow" />
      </Form.Dropdown>
    </Form>
  );
}

export default function SubscriptionLists() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { push, pop } = useNavigation();
  const { isLoading, data: lists, mutate, revalidate } = useCachedPromise(() => getPiholeAPI().getSubscriptionLists());

  async function handleDelete(address: string) {
    if (
      await confirmAlert({
        title: "Delete Subscription List",
        message: `Are you sure you want to delete this list?\n${address}`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting list...",
      });
      try {
        await mutate(getPiholeAPI().deleteSubscriptionList(address), {
          optimisticUpdate(data) {
            return data?.filter((l) => l.address !== address) ?? [];
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "List deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete list";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    }
  }

  async function handleToggle(address: string, enabled: boolean) {
    const action = enabled ? "Enabling" : "Disabling";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${action} list...`,
    });
    try {
      await mutate(getPiholeAPI().toggleSubscriptionList(address, enabled), {
        optimisticUpdate(data) {
          return data?.map((l) => (l.address === address ? { ...l, enabled } : l)) ?? [];
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = `List ${enabled ? "enabled" : "disabled"}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${action.toLowerCase()} list`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Subscription Lists" searchBarPlaceholder="Search subscription lists">
      <List.EmptyView title="No subscription lists configured" description="Press ⌘N to add a list" />
      {lists?.map((list) => (
        <List.Item
          key={list.id}
          title={list.address}
          icon={{
            source: list.type === "allow" ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: list.type === "allow" ? Color.Green : Color.Red,
          }}
          accessories={[
            {
              tag: {
                value: list.type,
                color: list.type === "allow" ? Color.Green : Color.Red,
              },
            },
            {
              tag: {
                value: list.enabled ? "enabled" : "disabled",
                color: list.enabled ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel title="Actions">
              <Action.OpenInBrowser url={list.address} />
              <Action
                title={list.enabled ? "Disable List" : "Enable List"}
                icon={list.enabled ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggle(list.address, !list.enabled)}
              />
              <Action
                title="Add New List"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <AddListForm
                      onSuccess={() => {
                        revalidate();
                        pop();
                      }}
                    />,
                  )
                }
              />
              <Action.CopyToClipboard title="Copy URL" content={list.address} />
              <Action
                title="Delete List"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(list.address)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
