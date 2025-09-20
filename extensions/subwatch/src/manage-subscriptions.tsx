import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";

import { fetchSubscriptions } from "./state";
import CreateSubscriptionAction from "./add-subscription";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const { subwatchApiKey, supabaseApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data, error, mutate } = fetchSubscriptions();

  if (error) {
    showFailureToast(error, { title: "An error occurred!" });
  }

  async function handleDelete(index: number) {
    const subscriptionToDelete = data?.[0].data[index];
    await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${subscriptionToDelete?.name}`,
    });

    const newData = data?.[0]?.data.filter((e) => e.domain != subscriptionToDelete?.domain);

    try {
      await mutate(
        fetch("https://nzyzephaenhlxoohrphc.supabase.co/rest/v1/rpc/raycast_update_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseApiKey,
          },
          body: JSON.stringify({
            raycast_uuid: subwatchApiKey,
            newdata: newData,
          }),
        }),
      );
      showToast({
        style: Toast.Style.Success,
        title: "Done!",
        message: `${subscriptionToDelete?.name} subscription deleted`,
      });
    } catch (err) {
      // The data will automatically be rolled back to its previous value.
      showFailureToast(err, {
        title: `Could not delete ${subscriptionToDelete?.name}`,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search subscriptions"
      searchBarPlaceholder="Search your subscriptions"
      isShowingDetail
    >
      {data?.[0]?.data?.map((item, index) => (
        <List.Item
          key={index}
          title={item.name.charAt(0).toUpperCase() + item.name.slice(1)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Create Subscription"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateSubscriptionAction />}
                />
                <DeleteSubscriptionAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`![Logo](https://img.logo.dev/${item.domain || `${item.name}.com`}?token=pk_JrIah0kcTFeKu4Xk9or1xw)`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Domain" target={`https://${item.domain}`} text={item.domain} />
                  <List.Item.Detail.Metadata.Label title="Interval" text={item.billing[0]?.interval} />
                  <List.Item.Detail.Metadata.Label title="Pricing" text={`$${String(item.billing[0]?.price)}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Start date" text={item.billing[0]?.start_date} />
                  <List.Item.Detail.Metadata.Label
                    title="End date"
                    text={
                      item.billing[0].end_date && item.billing[0].end_date !== "null" ? item.billing[0].end_date : ""
                    }
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

function DeleteSubscriptionAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Subscription"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}
