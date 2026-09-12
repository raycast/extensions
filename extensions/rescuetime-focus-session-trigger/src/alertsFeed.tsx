import { getPreferenceValues, ActionPanel, Action, Detail, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { convertDate } from "./utils/date";
import got from "got";

export default function Command() {
  const [state, setState] = useState<State>({ data: [], error: undefined });

  interface Preferences {
    APIkey: string;
  }

  interface State {
    data?: AlertItem[];
    error?: Error;
  }

  const preferences = getPreferenceValues<Preferences>();

  interface AlertItem {
    description: string;
    created_at: string | Date;
    alert_id: number;
  }

  useEffect(() => {
    async function fetchStories(): Promise<void> {
      try {
        const data: AlertItem[] = await got(`https://www.rescuetime.com/anapi/alerts_feed?key=${preferences.APIkey}&op=status`).json();
        setState({ data });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchStories();
  }, []);

  if (state.data) {
    if (state.data.length === 0) {
      return <Detail isLoading={false} markdown={`No highlights recorded. Visit [RescueTime Highlights](https://www.rescuetime.com/browse/highlights) to learn more.`} />;
    } else {
      return (
        <List>
          {state.data.map((item, index) => (
            <List.Item
              key={index}
              title={item.description}
              accessories={[{ text: convertDate(item.created_at as Date, "long"), icon: Icon.Calendar }]}
              actions={
                <ActionPanel title="Open in RescueTime">
                  <Action.OpenInBrowser
                    title="Open Alert/Goal in RescueTime"
                    url={`https://www.rescuetime.com/browse/goals/${item.alert_id}/by/hour/for/the/day/of/${(item.created_at as string).split("T")[0]}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
  } else {
    return <Detail isLoading={true} markdown={`Waiting for Alerts data...`} />;
  }
}
