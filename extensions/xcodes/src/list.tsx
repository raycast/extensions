import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { XcodeListItem } from "./components/xcodeListItem";
import { xcodesList } from "./lib/xcodes";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(() => xcodesList());

  const distributions = data ?? [];

  return (
    <List isLoading={isLoading}>
      {distributions.map((xcode) => (
        <XcodeListItem key={`${xcode.version}:${xcode.build}`} xcode={xcode} onAction={() => revalidate()} />
      ))}
    </List>
  );
}
