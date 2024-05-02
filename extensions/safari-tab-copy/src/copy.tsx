import { useEffect, useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { getSafariTabs, formatTabs, OPTIONS, getSafariTab } from "./utils";
import type { Option, Tab } from "./utils";

interface State {
  tabs: Tab[];
}

const Actions = function (props: { item: Option; tabs: Tab[] }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={formatTabs(props.tabs, props.item.key)} title="Copy" />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default function Command({ type }: { type: string }) {
  const [state, setState] = useState<State>({ tabs: [] });

  useEffect(() => {
    async function fetchTabs() {
      const tabs = type === "all" ? await getSafariTabs() : await getSafariTab();
      setState({ tabs });
    }

    fetchTabs();
  }, []);

  return (
    <List isLoading={!state.tabs}>
      {OPTIONS.map((option) => (
        <List.Item
          key={option.key}
          title={option.title}
          accessories={[{ text: option.subtitle }]}
          actions={<Actions item={option} tabs={state.tabs} />}
        />
      ))}
    </List>
  );
}
