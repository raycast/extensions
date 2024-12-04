import MailerLite, {  } from "@mailerlite/mailerlite-nodejs";
import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { getProgressIcon, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

const { mailerliteApiKey } = getPreferenceValues<Preferences>();
const mailerlite = new MailerLite({
  api_key: mailerliteApiKey
});
const SubscriberList = () => {
  const [status, setStatus] = useState("active");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-subscriber-details", false);

  const { isLoading, data: subscribers } = useCachedPromise(async (filterStatus) => {
    const res = await mailerlite.subscribers.get({
      filter: {
        status: filterStatus as "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk"
      }
    });
    return res.data.data;
  }, [status], {
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch subscribers"
    }
  });

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarAccessory={<List.Dropdown tooltip="Status" onChange={setStatus} storeValue>
      <List.Dropdown.Item title="Active" value="active" />
      <List.Dropdown.Item title="Unsubscribed" value="unsubscribed" />
      <List.Dropdown.Item title="Unconfirmed" value="unconfirmed" />
      <List.Dropdown.Item title="Bounced" value="bounced" />
      <List.Dropdown.Item title="Junk" value="junk" />
    </List.Dropdown>}>
      {subscribers.map((subscriber) => (
        <List.Item
          key={subscriber.id}
          icon={Icon.Person}
          title={subscriber.email}
          accessories={isShowingDetail ? undefined : [
            { text: `sent: ${subscriber.sent}` },
            { text: `opens: ${subscriber.opens_count}` },
            { text: `clicks: ${subscriber.clicks_count}` },
            {date: new Date(subscriber.subscribed_at)}]}
            detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Emails sent" text={subscriber.sent.toString()} />
              <List.Item.Detail.Metadata.Label title="Opened" icon={getProgressIcon(subscriber.open_rate)} text={`${subscriber.open_rate}%`} />
              <List.Item.Detail.Metadata.Label title="Clicked" icon={getProgressIcon(subscriber.click_rate)} text={`${subscriber.click_rate}%`} />
              <List.Item.Detail.Metadata.Label title="Subscribed on" text={`${subscriber.subscribed_at} via ${subscriber.source}`} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Email" text={subscriber.email} />
              <List.Item.Detail.Metadata.Label title="Groups" text={subscriber.groups?.join(", ") ?? "Not a member of any group"} />
              <List.Item.Detail.Metadata.Label title="Name" text={subscriber.fields.name} />
            </List.Item.Detail.Metadata>} />}
          actions={
            <ActionPanel>
              <Action icon={Icon.AppWindowSidebarLeft} title="Toggle Details" onAction={() => setIsShowingDetail(prev => !prev)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default SubscriberList;
