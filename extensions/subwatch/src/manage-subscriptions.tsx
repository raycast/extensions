import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";

import { fetchSubscriptions } from "./state";
import CreateSubscriptionAction from "./add-subscription";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data, error, mutate } = fetchSubscriptions();

  if (error) {
    showFailureToast(error, { title: "An error occurred!" });
  }

  function getOrdinalNum(n: number) {
    return n + (n > 0 ? ["th", "st", "nd", "rd"][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : "");
  }

  async function handleDelete(index: number) {
    const subscriptionToDelete = data?.[index];
    if (!subscriptionToDelete) {
      showFailureToast({
        title: `Could not delete subscription in index ${index}`,
      });
    }
    await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${subscriptionToDelete?.name}`,
    });

    try {
      await mutate(
        fetch(`https://subwatch.co/api/subscription/${subscriptionToDelete!.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": subwatchApiKey,
          },
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
      {data?.map((item, index) => (
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
                  <List.Item.Detail.Metadata.Label title="Interval" text={item.interval} />
                  <List.Item.Detail.Metadata.Label title="Pricing" text={`${item.currency} ${String(item.price)}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Renew at"
                    text={getOrdinalNum(new Date(item.start_date).getDate())}
                  />
                  <List.Item.Detail.Metadata.TagList title="Category">
                    <List.Item.Detail.Metadata.TagList.Item text={item.category} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Start date" text={new Date(item.start_date).toDateString()} />
                  <List.Item.Detail.Metadata.Label
                    title="End date"
                    text={item.end_date && item.end_date !== "null" ? new Date(item.end_date).toDateString() : ""}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Trial end date"
                    text={
                      item.trial_end_date && item.trial_end_date !== "null"
                        ? new Date(item.trial_end_date).toDateString()
                        : ""
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
