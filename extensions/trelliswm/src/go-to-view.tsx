import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runTrellisCommand } from "./lib/trellis";
import { loadViewNames, VIEW_NUMBERS, viewTitle } from "./lib/view-names";

export default function GoToView() {
  const { data: names = {}, isLoading } = usePromise(loadViewNames);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a view to go to">
      {VIEW_NUMBERS.map((n) => (
        <List.Item
          key={n}
          icon={Icon.ArrowRight}
          title={viewTitle(n, names)}
          subtitle={names[n] ? `View ${n}` : undefined}
          keywords={[String(n)]}
          accessories={[{ tag: `⌃⌥${n}`, tooltip: "TrellisWM shortcut" }]}
          actions={
            <ActionPanel>
              <Action title="Go to View" icon={Icon.ArrowRight} onAction={() => runTrellisCommand(`view?n=${n}`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
