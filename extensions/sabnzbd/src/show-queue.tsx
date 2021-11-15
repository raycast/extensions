import {
  List,
  showToast,
  ToastStyle,
  preferences,
  Icon,
  ImageLike,
  ActionPanel,
  Detail,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Client, Queue, QueueSlot, Results } from "sabnzbd-api";

export default function SlotList() {
  const [init, setInit] = useState<boolean>(false);
  const [slots, setSlots] = useState<QueueSlot[]>([]);

  useEffect(() => {
    async function fetch() {
      const slots = await fetchSlots();

      setSlots(slots);
      setInit(true);
    }

    fetch();
  }, []);

  const onSearchTextChange = async (text: string) => {
    let slots = await fetchSlots();
    slots = slots.filter((slot) => {
      return slot.filename.includes(text);
    });

    setSlots(slots);
  };

  return (
    <List isLoading={!init} searchBarPlaceholder="Filter slots by filename..." onSearchTextChange={onSearchTextChange}>
      {slots.map((slot) => (
        <SlotListItem key={slot.nzo_id} slot={slot} setSlots={setSlots} />
      ))}
    </List>
  );
}

function SlotListItem(props: { slot: QueueSlot; setSlots: any }) {
  const { push } = useNavigation();

  const slot = props.slot;
  const setSlots = props.setSlots;

  let icon: ImageLike;

  let actions: any;

  const detailAction = (
    <ActionPanel.Item
      title="Details"
      icon={{ source: { light: "file-light.png", dark: "file-dark.png" } }}
      onAction={() => push(<Details slot={slot} setSlots={setSlots} />)}
    />
  );

  switch (slot.status) {
    case "Paused":
      icon = { source: { light: "pause-light.png", dark: "pause-dark.png" } };

      actions = (
        <ActionPanel>
          {detailAction}
          <ActionPanel.Item
            title={"Resume"}
            onAction={() => onResume(slot, setSlots)}
            icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setSlots)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    case "Downloading":
      icon = { source: { light: "play-light.png", dark: "play-dark.png" } };

      actions = (
        <ActionPanel>
          {detailAction}
          <ActionPanel.Item
            title={"Pause"}
            onAction={() => onPause(slot, setSlots)}
            icon={{ source: { light: "pause-light.png", dark: "pause-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setSlots)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    case "Queued":
      icon = { source: { light: "hourglass-light.png", dark: "hourglass-dark.png" } };

      actions = (
        <ActionPanel>
          {detailAction}
          <ActionPanel.Item
            title={"Resume"}
            onAction={() => onResume(slot, setSlots)}
            icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setSlots)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    default:
      actions = (
        <ActionPanel>
          {detailAction}
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setSlots)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      console.log(`Unknown slot status: ${slot.status}`);

      icon = Icon.QuestionMark;
  }

  let timeleft: string;

  if (slot.status == "Downloading") {
    timeleft = slot.timeleft;
  } else {
    timeleft = "";
  }

  return (
    <List.Item
      id={slot.nzo_id}
      key={slot.nzo_id}
      title={slot.filename}
      subtitle={timeleft}
      icon={icon}
      actions={actions}
    />
  );
}

function Details(props: { slot: QueueSlot; setSlots: any }) {
  const slot = props.slot;
  const setSlots = props.slot;

  let labels: String;

  if (slot.labels && slot.labels.length > 0) {
    labels = slot.labels.join(", ");
  } else {
    labels = "None";
  }

  const markdown = `# ${slot.filename}\n\nStatus: ${slot.status}\n\nPriority: ${slot.priority}\n\nIndex: ${slot.index}\n\nCategory: ${slot.cat}\n\nSize: ${slot.size}\n\nSize left: ${slot.sizeleft}\n\nCompleted percentage: ${slot.percentage}%\n\nTimeleft: ${slot.timeleft}\n\nLabels: ${labels}\n\nScript: ${slot.script}`;

  return <Detail markdown={markdown} navigationTitle={slot.filename} />;
}

async function onDelete(slot: QueueSlot, setSlots: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobDelete(slot.nzo_id)) as Results;

    const slots = await fetchSlots();

    setSlots(slots);

    showToast(ToastStyle.Success, "Deleted job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not delete job");
  }
}

async function onPause(slot: QueueSlot, setSlots: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobPause(slot.nzo_id)) as Results;

    const slots = await fetchSlots();

    setSlots(slots);

    showToast(ToastStyle.Success, "Paused job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not pause job");
  }
}

async function onResume(slot: QueueSlot, setSlots: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobResume(slot.nzo_id)) as Results;

    const slots = await fetchSlots();

    setSlots(slots);

    showToast(ToastStyle.Success, "Resumed job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not resume job");
  }
}

async function fetchSlots(): Promise<QueueSlot[]> {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const queue = (await client.queue()) as Queue;

    return Promise.resolve(queue.slots);
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load slots");
    return Promise.resolve([]);
  }
}
