import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";

import { getStuff } from "./state";
import CreateSubscriptionAction from "./add-subscription";

export default function Command() {
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data, error, mutate } = getStuff();

  if (error) {
    showToast({
      style: Toast.Style.Success,
      title: "An error occurred!",
      message: error.message,
    });
  }

  async function handleDelete(index: number) {
    const subscriptionToDelete = data?.[0].data[index];
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${subscriptionToDelete?.name}` });

    try {
      data?.[0].data.splice(index, 1);
      await mutate(
        fetch("https://nzyzephaenhlxoohrphc.supabase.co/rest/v1/rpc/raycast_update_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXplcGhhZW5obHhvb2hycGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTQzMjgsImV4cCI6MjA1OTc3MDMyOH0.6AboCGgJGqJMTgqUH3LsYmhoWQ8sfEWqdv0cY-1EXIg",
          },
          body: JSON.stringify({ raycast_uuid: subwatchApiKey, newdata: data?.[0].data }),
        }),
      );
      showToast({
        style: Toast.Style.Success,
        title: "Done!",
        message: `${subscriptionToDelete?.name} subscription deleted`,
      });
    } catch (err) {
      // The data will automatically be rolled back to its previous value.
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add ${subscriptionToDelete?.name}`;
      toast.message = err?.message;
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search subscriptions"
      searchBarPlaceholder="Search your subscriptions"
      isShowingDetail
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <CreateSubscriptionAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {data?.[0]?.data.map((item, index) => (
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
                  <List.Item.Detail.Metadata.Label title="Interval" text={item.billing[0].interval} />
                  <List.Item.Detail.Metadata.Label title="Pricing" text={String(item.billing[0].price)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Start date" text={item.billing[0].start_date} />
                  <List.Item.Detail.Metadata.Label
                    title="End date"
                    text={
                      item.billing[0].end_date && item.billing[0].end_date != "null" ? item.billing[0].end_date : ""
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
