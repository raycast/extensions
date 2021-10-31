import { List, showToast, ToastStyle, preferences, Icon, ImageLike, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Client, Queue, QueueSlot, Results } from "sabnzbd-api";

export default function SlotList() {
  const [state, setState] = useState<{ slots: QueueSlot[] }>({ slots: [] });

  useEffect(() => {
    async function fetch() {
      const slots = await fetchSlots();
      setState((oldState) => ({
        ...oldState,
        slots: slots,
      }));
    }

    fetch();
  }, []);

  const onSearchTextChange = async (text: string) => {
    let slots = await fetchSlots();
    slots = slots.filter((slot) => {
      return slot.filename.includes(text);
    });

    setState((oldState) => ({
      ...oldState,
      slots: slots,
    }));
  };

  return (
    <List
      isLoading={state.slots.length === 0}
      searchBarPlaceholder="Filter slots by filename..."
      onSearchTextChange={onSearchTextChange}
    >
      {state.slots.map((slot) => (
        <SlotListItem key={slot.nzo_id} slot={slot} />
      ))}
    </List>
  );
}

function SlotListItem(props: { slot: QueueSlot }) {
  const slot = props.slot;

  let icon: ImageLike;

  let actions: any;

  switch (slot.status) {
    case "Paused":
      icon = Icon.ChevronDown;

      actions = (
        <ActionPanel>
          <ActionPanel.Item title={"Resume"} onAction={() => onResume(slot)} />
          <ActionPanel.Item title={"Delete"} onAction={() => onDelete(slot)} />
        </ActionPanel>
      );

      break;

    case "Downloading":
      icon = Icon.ChevronUp;

      actions = (
        <ActionPanel>
          <ActionPanel.Item title={"Pause"} onAction={() => onPause(slot)} />
          <ActionPanel.Item title={"Delete"} onAction={() => onDelete(slot)} />
        </ActionPanel>
      );

      break;

    case "Queued":
      icon = Icon.Dot;

      actions = (
        <ActionPanel>
          <ActionPanel.Item title={"Resume"} onAction={() => onResume(slot)} />
          <ActionPanel.Item title={"Delete"} onAction={() => onDelete(slot)} />
        </ActionPanel>
      );

      break;

    default:
      actions = (
        <ActionPanel>
          <ActionPanel.Item title={"Delete"} onAction={() => onDelete(slot)} />
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

async function onDelete(slot: QueueSlot) {
  console.log("Delete slot");

  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobDelete(slot.nzo_id)) as Results;
    showToast(ToastStyle.Success, "Deleted job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not delete job");
  }
}

async function onPause(slot: QueueSlot) {
  console.log("Pause slot");

  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobPause(slot.nzo_id)) as Results;
    showToast(ToastStyle.Success, "Paused job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not pause job");
  }
}

async function onResume(slot: QueueSlot) {
  console.log("Resume slot");

  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobResume(slot.nzo_id)) as Results;
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
