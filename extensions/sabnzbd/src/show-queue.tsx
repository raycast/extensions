import { List, showToast, Icon, ActionPanel, Detail, Action, Image, Toast, Keyboard } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { QueueSlot } from "sabnzbd-api";
import { client } from "./sabnzbd";

type Mutate = MutatePromise<QueueSlot[]>;
export default function SlotList() {
  const {
    isLoading,
    data: slots,
    mutate,
  } = useCachedPromise(
    async () => {
      const queue = await client.queue();
      return queue.slots;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not load Slots",
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter slots by filename">
      {slots.map((slot) => (
        <SlotListItem key={slot.nzo_id} slot={slot} slots={slots} mutate={mutate} />
      ))}
    </List>
  );
}

function SlotListItem(props: { slot: QueueSlot; slots: QueueSlot[]; mutate: Mutate }) {
  const slot = props.slot;
  const slots = props.slots;
  const noOfSlots = slots.length - 1;
  const mutate = props.mutate;

  let icon: Image.ImageLike;

  let actions: ActionPanel.Children;

  const detailAction = <Action.Push title="Details" icon={Icon.Document} target={<Details slot={slot} />} />;

  const first = slot.index === 0;
  const last = slot.index === noOfSlots;

  const moveUpAction = <Action title="Move Up" onAction={() => onMoveUp(slot, slots, mutate)} icon={Icon.ArrowUp} />;
  const moveDownAction = (
    <Action title="Move Down" onAction={() => onMoveDown(slot, slots, mutate)} icon={Icon.ArrowDown} />
  );

  const DeleteAction = () => (
    <Action
      title="Delete"
      onAction={() => onDelete(slot, mutate)}
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
    />
  );

  switch (slot.status) {
    case "Paused":
      icon = Icon.Pause;

      actions = (
        <ActionPanel>
          <ActionPanel.Section title="State">
            {detailAction}
            <Action title="Resume" onAction={() => onResume(slot, mutate)} icon={Icon.Play} />
            <DeleteAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Position">
            {first && moveDownAction}
            {!first && !last && moveUpAction}
            {!first && !last && moveDownAction}
            {last && moveUpAction}
          </ActionPanel.Section>
        </ActionPanel>
      );

      break;

    case "Downloading":
      icon = Icon.Play;

      actions = (
        <ActionPanel>
          {detailAction}
          <Action title="Pause" onAction={() => onPause(slot, mutate)} icon={Icon.Pause} />
          <DeleteAction />
        </ActionPanel>
      );

      break;

    case "Queued":
      icon = Icon.Hourglass;

      actions = (
        <ActionPanel>
          {detailAction}
          <Action title="Resume" onAction={() => onResume(slot, mutate)} icon={Icon.Play} />
          <DeleteAction />
        </ActionPanel>
      );

      break;

    default:
      actions = (
        <ActionPanel>
          {detailAction}
          <DeleteAction />
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
      accessories={[{ tag: slot.status }]}
      icon={icon}
      actions={actions}
    />
  );
}

function Details(props: { slot: QueueSlot }) {
  const slot = props.slot;

  let labels: string;

  if (slot.labels && slot.labels.length > 0) {
    labels = slot.labels.join(", ");
  } else {
    labels = "None";
  }

  const markdown = `# ${slot.filename}\n\nStatus: ${slot.status}\n\nPriority: ${slot.priority}\n\nIndex: ${slot.index}\n\nCategory: ${slot.cat}\n\nSize: ${slot.size}\n\nSize left: ${slot.sizeleft}\n\nCompleted percentage: ${slot.percentage}%\n\nTimeleft: ${slot.timeleft}\n\nLabels: ${labels}\n\nScript: ${slot.script}`;

  return <Detail markdown={markdown} navigationTitle={slot.filename} />;
}

async function onMoveUp(slot: QueueSlot, slots: QueueSlot[], mutate: Mutate) {
  await moveJob(slot, slots, "up", mutate);
}

async function onMoveDown(slot: QueueSlot, slots: QueueSlot[], mutate: Mutate) {
  await moveJob(slot, slots, "down", mutate);
}

async function moveJob(slot: QueueSlot, slots: QueueSlot[], direction: "up" | "down", mutate: Mutate) {
  // The job being shifted up
  const firstSlot = direction === "up" ? slot : slots[slot.index + 1];
  // The job being moved down
  const secondSlot = direction === "up" ? slots[slot.index - 1] : slot;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Moving Job" });
  try {
    await mutate(
      client
        .jobMove(firstSlot.nzo_id, secondSlot.nzo_id)
        .then((result: { result: { position: number; priority: number } }) => {
          if (result.result.position === -1) throw new Error();
        }),
      {
        optimisticUpdate(data) {
          const from = firstSlot.index;
          const to = secondSlot.index;
          const newQueue = data;
          [newQueue[from], newQueue[to]] = [newQueue[to], newQueue[from]];
          return newQueue;
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Moved Job";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not move Job";
  }
}

async function onDelete(slot: QueueSlot, mutate: Mutate) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Job" });
  try {
    await mutate(
      client.jobDelete(slot.nzo_id).then((result) => {
        if (!result.status || result.error) throw new Error();
      }),
      {
        optimisticUpdate(data) {
          return data.filter((item) => item.nzo_id !== slot.nzo_id);
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Deleted Job";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not delete Job";
  }
}

async function onPause(slot: QueueSlot, mutate: Mutate) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing Job" });
  try {
    await mutate(
      client.jobPause(slot.nzo_id).then((result) => {
        if (!result.status || result.error) throw new Error();
      }),
      {
        optimisticUpdate(data) {
          const newQueue = data;
          const index = data.findIndex((item) => item.nzo_id === slot.nzo_id);
          newQueue[index].status = "Paused";
          return newQueue;
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Paused Job";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not pause Job";
  }
}

async function onResume(slot: QueueSlot, mutate: Mutate) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming Job" });
  try {
    await mutate(
      client.jobResume(slot.nzo_id).then((result) => {
        if (!result.status || result.error) throw new Error();
      }),
      {
        optimisticUpdate(data) {
          const newQueue = data;
          const index = data.findIndex((item) => item.nzo_id === slot.nzo_id);
          newQueue[index].status = "Downloading";
          return newQueue;
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Resumed Job";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not resume Job";
  }
}
