import { getPreferenceValues, ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { convertDate } from "./utils/date";
import got from "got";

export default function Command() {
  const [state, setState] = useState<State>({ data: [], error: undefined });

  interface Preferences {
    APIkey: string;
  }

  interface State {
    data?: FocusTimeItem[];
    error?: Error;
  }

  interface FocusTimeItem {
    created_at: string | Date;
    duration: number;
    duration_unit: string;
  }

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchFocusTimeFeed() {
      try {
        const data: FocusTimeItem[] = await got(`https://www.rescuetime.com/anapi/focustime_started_feed?key=${preferences.APIkey}`).json();
        setState({ data });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchFocusTimeFeed();
  }, []);

  if (state.data) {
    if (state.data.length === 0) {
      return (
        <Detail
          isLoading={false}
          markdown={`No FocusTime sessions recorded. Visit [RescueTime FocusTime settings](https://www.rescuetime.com/settings/focustime) to learn more.`}
        />
      );
    } else {
      return (
        <List>
          {state.data.map((item, index) => (
            <List.Item
              key={index}
              title={convertDate(item.created_at as Date, "long")}
              accessories={[{ text: `${item.duration} ${item.duration_unit}`, icon: Icon.Clock }]}
              actions={
                <ActionPanel title="Open FocusTime Settings">
                  <Action.OpenInBrowser title="FocusTime Settings" url="https://www.rescuetime.com/settings/focustime" />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
  } else {
    return <Detail isLoading={true} markdown={`Waiting for FocusTime Feed data...`} />;
  }
}
