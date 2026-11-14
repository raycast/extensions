import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { type Feed, getFeeds } from "./feeds";

const LOCAL_TIME = "";

function utcOffset(timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  return name === "GMT" ? "UTC" : (name?.replace("GMT", "UTC") ?? "");
}

function FeedTimeZoneForm({ feed, onSave }: { feed: Feed; onSave: () => void }) {
  const navigation = useNavigation();
  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  const save = async (values: { timeZone: string }) => {
    const feeds = await getFeeds();
    const index = feeds.findIndex((f) => f.url === feed.url);
    if (index === -1) {
      await showToast({ style: Toast.Style.Failure, title: "Feed not found", message: feed.title });
      return;
    }
    feeds[index] = { ...feeds[index], timeZone: values.timeZone || undefined };
    await LocalStorage.setItem("feeds", JSON.stringify(feeds));
    await showToast({
      style: Toast.Style.Success,
      title: "Time Zone Saved",
      message: values.timeZone || "Local Time",
    });
    onSave();
    navigation.pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Time Zone" icon={Icon.Globe} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={feed.title}
        text="Used only for this feed's dates that don't include a time zone, such as 2026-01-01T12:00:00."
      />
      <Form.Dropdown id="timeZone" title="Time Zone" defaultValue={feed.timeZone ?? LOCAL_TIME}>
        <Form.Dropdown.Item value={LOCAL_TIME} title="Local Time" icon={Icon.Clock} />
        {timeZones.map((timeZone) => (
          <Form.Dropdown.Item key={timeZone} value={timeZone} title={`${timeZone} (${utcOffset(timeZone)})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default FeedTimeZoneForm;
