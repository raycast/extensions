import { List, showToast, ToastStyle, preferences, Icon, ImageLike } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Client, Queue, QueueSlot } from "sabnzbd-api";

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

  return (
    <List isLoading={state.slots.length === 0} searchBarPlaceholder="Filter slots by filename...">
      {state.slots.map((slot) => (
        <SlotListItem key={slot.nzo_id} slot={slot} />
      ))}
    </List>
  );
}

function SlotListItem(props: { slot: QueueSlot }) {
  const slot = props.slot;

  let icon: ImageLike;

  switch (slot.status) {
    case "Paused":
      icon = Icon.ChevronDown;
      break;

    case "Downloading":
      icon = Icon.ChevronUp;
      break;

    case "Queued":
      icon = Icon.Dot;
      break;

    default:
      icon = Icon.QuestionMark;
  }

  let timeleft: string;

  if (slot.status == "Downloading") {
    timeleft = slot.timeleft;
  } else {
    timeleft = "";
  }

  return <List.Item id={slot.nzo_id} key={slot.nzo_id} title={slot.filename} subtitle={timeleft} icon={icon} />;
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
