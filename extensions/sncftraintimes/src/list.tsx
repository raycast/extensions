import { Action, ActionPanel, List, LocalStorage, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { Journey, STORAGE_JOURNEYS_KEY } from "./types";
import { useEffect, useState } from "react";
import Add from "./add";
import Detail from "./detail";

function formatJourney(journey: Journey) {
  return `${journey.departure.name} -> ${journey.arrival.name}`;
}

export default function ListJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);

  useEffect(() => {
    (async () => {
      const storedJourneys = (await LocalStorage.getItem<string>(STORAGE_JOURNEYS_KEY)) || "[]";

      if (!storedJourneys) {
        return;
      }

      try {
        const parsedJourneys: Journey[] = JSON.parse(storedJourneys);
        setJourneys(parsedJourneys);
      } catch (e) {
        showToast({
          title: "Error while displaying journeys",
          style: Toast.Style.Failure,
        });
      }
    })();
  }, []);

  const deleteJourney = async (index: number) => {
    const storedJourneys = await LocalStorage.getItem<string>(STORAGE_JOURNEYS_KEY);

    if (!storedJourneys) {
      return;
    }

    try {
      const parsedJourneys: Journey[] = JSON.parse(storedJourneys);
      parsedJourneys.splice(index, 1);
      await LocalStorage.setItem(STORAGE_JOURNEYS_KEY, JSON.stringify(parsedJourneys));
      setJourneys(parsedJourneys);
    } catch (e) {
      showToast({
        title: "Error while deleting the journey",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <List>
      {journeys.length > 0 &&
        journeys.map((journey, i) => (
          <List.Item
            key={i}
            title={formatJourney(journey)}
            actions={
              <ActionPanel title={`Actions for ${formatJourney(journey)}`}>
                <Action.Push title="View Hours" target={<Detail journey={journey} />} />
                <Action
                  title="Delete"
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={async () => deleteJourney(i)}
                />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      {journeys.length === 0 && (
        <List.EmptyView
          title="No journeys, you can use the 'Add' command to add journey"
          actions={
            <ActionPanel>
              <Action.Push title="Go to Add" target={<Add />} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
