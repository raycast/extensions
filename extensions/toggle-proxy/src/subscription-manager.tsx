import {
  ActionPanel,
  Action,
  List,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  Subscription,
  getSubscriptions,
  addSubscription,
  deleteSubscription,
  updateSubscription,
} from "./utils/subscription";

export default function SubscriptionManager() {
  const prefs = getPreferenceValues<Preferences>();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);
    const subs = await getSubscriptions();
    setSubscriptions(subs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleUpdate = async (sub: Subscription) => {
    try {
      await showToast(Toast.Style.Animated, `Updating ${sub.name}...`);
      const result = await updateSubscription(sub.id, prefs);
      await showToast(Toast.Style.Success, `Updated: ${result.serverCount} servers`);
      await loadSubscriptions();
    } catch (error) {
      await showToast(Toast.Style.Failure, (error as Error).message);
    }
  };

  const handleUpdateAll = async () => {
    try {
      await showToast(Toast.Style.Animated, "Updating all subscriptions...");
      let totalServers = 0;
      for (const sub of subscriptions) {
        try {
          const result = await updateSubscription(sub.id, prefs);
          totalServers += result.serverCount;
        } catch (error) {
          console.log(`Failed to update ${sub.name}:`, error);
        }
      }
      await showToast(Toast.Style.Success, `Updated: ${totalServers} servers`);
      await loadSubscriptions();
    } catch (error) {
      await showToast(Toast.Style.Failure, (error as Error).message);
    }
  };

  const handleDelete = async (sub: Subscription) => {
    const confirmed = await confirmAlert({
      title: "Delete Subscription?",
      message: `${sub.name}\nAll configs for this subscription will be deleted.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteSubscription(sub.id, prefs.xrayPath);
        await showToast(Toast.Style.Success, `Subscription ${sub.name} deleted`);
        await loadSubscriptions();
      } catch (error) {
        await showToast(Toast.Style.Failure, (error as Error).message);
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search subscriptions...">
      {subscriptions.map((sub) => (
        <List.Item
          key={sub.id}
          title={sub.name}
          subtitle={sub.url.length > 50 ? sub.url.slice(0, 50) + "..." : sub.url}
          accessories={[
            { text: `${sub.serverCount} servers` },
            ...(sub.lastUpdated ? [{ date: new Date(sub.lastUpdated) }] : [{ text: "Never updated" }]),
          ]}
          actions={
            <ActionPanel>
              <Action title="Update Subscription" onAction={() => handleUpdate(sub)} icon={Icon.ArrowClockwise} />
              <Action.Push
                title="Add Subscription"
                target={<AddSubscriptionForm onAdded={loadSubscriptions} prefs={prefs} />}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Update All"
                onAction={handleUpdateAll}
                icon={Icon.RotateAntiClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
              <Action
                title="Delete"
                onAction={() => handleDelete(sub)}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {subscriptions.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Subscriptions"
          description="Add a VLESS subscription"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Subscription"
                target={<AddSubscriptionForm onAdded={loadSubscriptions} prefs={prefs} />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function AddSubscriptionForm({ onAdded, prefs }: { onAdded: () => Promise<void>; prefs: Preferences }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast(Toast.Style.Failure, "Please enter a subscription name");
      return;
    }
    if (!url.trim()) {
      await showToast(Toast.Style.Failure, "Please enter a subscription URL");
      return;
    }

    try {
      const sub = await addSubscription(name.trim(), url.trim());
      await showToast(Toast.Style.Animated, "Loading subscription...");
      const result = await updateSubscription(sub.id, prefs);
      await showToast(Toast.Style.Success, `Added: ${result.serverCount} servers`);
      await onAdded();
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, (error as Error).message);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My VPN Provider" value={name} onChange={setName} />
      <Form.TextField
        id="url"
        title="Subscription URL"
        placeholder="https://example.com/subscriptions/..."
        value={url}
        onChange={setUrl}
      />
    </Form>
  );
}
