import { List, showToast, Icon, ActionPanel, Detail, Action, Image, Toast, Color } from "@raycast/api";
import { type History, HistorySlots } from "sabnzbd-api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { client } from "./sabnzbd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

type Mutate = MutatePromise<HistorySlots[]>;

export default function History() {
  const {
    isLoading,
    data: historySlots,
    mutate,
  } = useCachedPromise(
    async () => {
      const history = await client.history();
      return history.slots;
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      failureToastOptions: {
        title: "Could not load History Slots",
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter slots by name">
      {historySlots.map((slot) => (
        <HistorySlotListItem key={slot.nzo_id} slot={slot} mutate={mutate} />
      ))}
    </List>
  );
}

function HistorySlotListItem(props: { slot: HistorySlots; mutate: Mutate }) {
  const slot = props.slot;
  const mutate = props.mutate;

  let icon: Image.ImageLike;

  const actions = (
    <ActionPanel>
      <Action.Push title="Details" icon={Icon.Document} target={<Details slot={slot} />} />
      <Action
        title="Delete"
        onAction={() => onDelete(slot, mutate)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
      />
    </ActionPanel>
  );

  if (slot.status == "Completed") {
    icon = Icon.Check;
  } else if (slot.status == "Extracting") {
    icon = Icon.Bolt;
  } else if (slot.status == "Verifying") {
    icon = Icon.Key;
  } else if (slot.status == "Queued") {
    icon = Icon.Pause;
  } else if (slot.status == "Repairing") {
    icon = Icon.WrenchScrewdriver;
  } else if (slot.status == "Failed") {
    icon = { source: Icon.Info, tintColor: Color.Red };
  } else {
    icon = Icon.QuestionMark;
  }

  const completed = dayjs().to(dayjs.unix(slot.completed));

  return (
    <List.Item
      id={slot.nzo_id}
      key={slot.nzo_id}
      title={slot.name}
      subtitle={completed}
      icon={icon}
      actions={actions}
    />
  );
}

function Details(props: { slot: HistorySlots }) {
  const slot = props.slot;

  const completed = dayjs().to(dayjs.unix(slot.completed));

  const markdown = `# ${slot.name}\n\nStatus: ${slot.status}\n\nCategory: ${slot.category}\n\nStorage: ${slot.storage}\n\nCompleted: ${completed}`;

  return <Detail markdown={markdown} navigationTitle={slot.name} />;
}

async function onDelete(slot: HistorySlots, mutate: Mutate) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting History Item" });
  try {
    await mutate(
      client.historyDelete(slot.nzo_id).then((result) => {
        if (!result.status || result.error) throw new Error();
      }),
      {
        optimisticUpdate(data) {
          return data.filter((item) => item.nzo_id !== slot.nzo_id);
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Deleted History Item";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not delete History Item";
  }
}
