import { LaunchProps } from "@raycast/api";
import SubscriptionsView from "./components/subscriptions/SubscriptionsView";

/** `selectedKey` selects that subscription, e.g. when it's clicked in "Subscriptions Menu Bar". */
export default function Command(props: LaunchProps<{ launchContext?: { selectedKey?: string } }>) {
  return <SubscriptionsView selectedKey={props.launchContext?.selectedKey} />;
}
