import { Action, Icon } from "@raycast/api";
import { FeedbinApiContextProvider } from "../utils/FeedbinApiContext";
import { Entry } from "../utils/api";
import { EntryList } from "./EntryList";

export interface ActionViewSubscriptionProps {
  feedName: string;
  entry: Entry;
}

export function ActionViewSubscription(props: ActionViewSubscriptionProps) {
  return (
    <Action.Push
      title="Show Only This Feed"
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "f",
      }}
      icon={Icon.Filter}
      target={
        <FeedbinApiContextProvider feedId={props.entry.feed_id}>
          <EntryList navigationTitle={props.feedName} />
        </FeedbinApiContextProvider>
      }
    />
  );
}
