import { getPreferenceValues, ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { convertDate } from "./utils/date";
import got from "got";

export default function Command() {
  const [state, setState] = useState<State>({ data: [], error: undefined });

  interface Preferences {
    APIkey: string;
  }

  interface HighlightItem {
    description: string;
    created_at: string | Date;
    // Add other properties if necessary
  }

  interface State {
    data?: HighlightItem[];
    error?: Error;
  }

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchHighlights() {
      try {
        const data: HighlightItem[] = await got(`https://www.rescuetime.com/anapi/highlights_feed?key=${preferences.APIkey}`).json();
        setState({ data });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchHighlights();
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
                <ActionPanel title="Open Day in RescueTime">
                  <Action.OpenInBrowser
                    title="Open Highlight in RescueTime"
                    url={`https://www.rescuetime.com/browse/highlights/for/the/day/of/${convertDate(item.created_at as Date, "short")}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
  } else {
    return <Detail isLoading={true} markdown={`Waiting for Highlights data...`} />;
  }
}
