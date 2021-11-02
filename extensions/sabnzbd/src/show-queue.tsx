import { List, showToast, ToastStyle, preferences, Icon, ImageLike, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Client, Queue, QueueSlot, Results } from "sabnzbd-api";

export default function SlotList() {
  const [state, setState] = useState<{ slots: QueueSlot[], init: boolean }>({ slots: [], init: false  });

  useEffect(() => {
    async function fetch() {
      const slots = await fetchSlots();
      setState((oldState) => ({
        ...oldState,
        slots: slots,
        init: true
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
      isLoading={!state.init}
      searchBarPlaceholder="Filter slots by filename..."
      onSearchTextChange={onSearchTextChange}
    >
      {state.slots.map((slot) => (
        <SlotListItem key={slot.nzo_id} slot={slot} setState={setState} />
      ))}
    </List>
  );
}

function SlotListItem(props: { slot: QueueSlot; setState: any }) {
  const slot = props.slot;
  const setState = props.setState;

  let icon: ImageLike;

  let actions: any;

  switch (slot.status) {
    case "Paused":
      icon = { source: { light: "pause-light.png", dark: "pause-dark.png" } };

      actions = (
        <ActionPanel>
          <ActionPanel.Item
            title={"Resume"}
            onAction={() => onResume(slot, setState)}
            icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setState)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    case "Downloading":
      icon = { source: { light: "play-light.png", dark: "play-dark.png" } };

      actions = (
        <ActionPanel>
          <ActionPanel.Item
            title={"Pause"}
            onAction={() => onPause(slot, setState)}
            icon={{ source: { light: "pause-light.png", dark: "pause-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setState)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    case "Queued":
      icon = { source: { light: "hourglass-light.png", dark: "hourglass-dark.png" } };

      actions = (
        <ActionPanel>
          <ActionPanel.Item
            title={"Resume"}
            onAction={() => onResume(slot, setState)}
            icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
          />
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setState)}
            icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
          />
        </ActionPanel>
      );

      break;

    default:
      actions = (
        <ActionPanel>
          <ActionPanel.Item
            title={"Delete"}
            onAction={() => onDelete(slot, setState)}
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

async function onDelete(slot: QueueSlot, setState: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobDelete(slot.nzo_id)) as Results;

    const slots = await fetchSlots();
    setState((oldState: any) => ({
      ...oldState,
      slots: slots,
    }));

    showToast(ToastStyle.Success, "Deleted job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not delete job");
  }
}

async function onPause(slot: QueueSlot, setState: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobPause(slot.nzo_id)) as Results;

    const slots = await fetchSlots();
    setState((oldState: any) => ({
      ...oldState,
      slots: slots,
    }));

    showToast(ToastStyle.Success, "Paused job");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not pause job");
  }
}

async function onResume(slot: QueueSlot, setState: any) {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.jobResume(slot.nzo_id)) as Results;

    const slots = await fetchSlots();
    setState((oldState: any) => ({
      ...oldState,
      slots: slots,
    }));

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
