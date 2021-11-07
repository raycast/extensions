import { List, showToast, ToastStyle, preferences, Icon, ImageLike, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Client, History, HistorySlots, Results } from "sabnzbd-api";

export default function History() {
  const [init, setInit] = useState(false);
  const [historySlots, setHistorySlots] = useState([]);

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
  const slot = props.slot;
  const setHistorySlots = props.setHistorySlots;

  return <List.Item id={slot.nzo_id} key={slot.nzo_id} title={slot.name} />;
}

async function fetchHistorySlots(): Promise<HistorySlots[]> {
  let client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const history = (await client.history()) as History;

    return Promise.resolve(history.slots);
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load history slots");
    return Promise.resolve([]);
  }
}
