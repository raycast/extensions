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
import { Client, History, HistorySlots, Results } from "sabnzbd-api";
import moment from "moment";

export default function History() {
  const [init, setInit] = useState<boolean>(false);
  const [historySlots, setHistorySlots] = useState<HistorySlots[]>([]);

  useEffect(() => {
    async function fetch() {
      const historySlots = await fetchHistorySlots();

      setHistorySlots(historySlots);
      setInit(true);
    }

    fetch();
  }, []);

  const onSearchTextChange = async (text: string) => {
    let historySlots = await fetchHistorySlots();
    historySlots = historySlots.filter((slot) => {
      return slot.name.includes(text);
    });

    setHistorySlots(historySlots);
  };

  return (
    <List isLoading={!init} searchBarPlaceholder="Filter slots by name..." onSearchTextChange={onSearchTextChange}>
      {historySlots.map((slot) => (
        <HistorySlotListItem key={slot.nzo_id} slot={slot} setHistorySlots={setHistorySlots} />
      ))}
    </List>
  );
}

function HistorySlotListItem(props: { slot: HistorySlots; setHistorySlots: any }) {
  const { push } = useNavigation();

  const slot = props.slot;
  const setHistorySlots = props.setHistorySlots;

  let icon: ImageLike;

  const actions = (
    <ActionPanel>
      <ActionPanel.Item
        title="Details"
        icon={{ source: { light: "file-light.png", dark: "file-dark.png" } }}
        onAction={() => push(<Details slot={slot} setHistorySlots={setHistorySlots} />)}
      />
      <ActionPanel.Item
        title={"Delete"}
        onAction={() => onDelete(slot, setHistorySlots)}
        icon={{ source: { light: "bin-light.png", dark: "bin-dark.png" } }}
      />
    </ActionPanel>
  );

  if (slot.status == "Completed") {
    icon = { source: { light: "ok-light.png", dark: "ok-dark.png" } };
  } else if (slot.status == "Extracting") {
    icon = { source: { light: "bolt-light.png", dark: "bolt-dark.png" } };
  } else if (slot.status == "Verifying") {
    icon = { source: { light: "key-light.png", dark: "key-dark.png" } };
  } else if (slot.status == "Queued") {
    icon = { source: { light: "pause-light.png", dark: "pause-dark.png" } };
  } else if (slot.status == "Repairing") {
    icon = { source: { light: "tool-light.png", dark: "tool-dark.png" } };
  } else if (slot.status == "Failed") {
    icon = { source: { light: "error-light.png", dark: "error-dark.png" } };
  } else {
    console.log(`Unknown slot status: ${slot.status}`);

    icon = Icon.QuestionMark;
  }

  const completed = moment.unix(slot.completed).fromNow();

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

function Details(props: { slot: HistorySlots; setHistorySlots: any }) {
  const slot = props.slot;

  const completed = moment.unix(slot.completed).fromNow();

  const markdown = `# ${slot.name}\n\nStatus: ${slot.status}\n\nCategory: ${slot.category}\n\nStorage: ${slot.storage}\n\nCompleted: ${completed}`;

  return <Detail markdown={markdown} navigationTitle={slot.name} />;
}

async function onDelete(slot: HistorySlots, setHistorySlots: any) {
  const client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.historyDelete(slot.nzo_id)) as Results;

    const slots = await fetchHistorySlots();

    setHistorySlots(slots);

    showToast(ToastStyle.Success, "Deleted history item");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not delete history item");
  }
}

async function fetchHistorySlots(): Promise<HistorySlots[]> {
  const client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const history = (await client.history()) as History;

    return Promise.resolve(history.slots);
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load history slots");
    return Promise.resolve([]);
  }
}
