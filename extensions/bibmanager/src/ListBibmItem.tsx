import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Icon } from "@raycast/api";

interface Item {
  uid: string;
  title: string;
  link: string;
  pdf: string;
  year: string;
}

export function ListBibmItem(props: { item: Item; index: number }) {
  const [state, setState] = useState<{ icon: string; accessories: List.Item.Accessory[] }>({
    icon: Icon.Dot,
    accessories: [],
  });
  useEffect(() => {
    const accessories = [];
    accessories.push({ icon: Icon.Clock, text: props.item.year.toString() });
    const icon = Icon.Dot;

    setState({ icon, accessories });
  }, [props.item, props.index]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.uid ?? "No title"}
      subtitle={props.item.title}
      accessories={state.accessories}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.pdf && (
          <Action.OpenWith path={props.item.pdf} title="Open PDF" shortcut={{ modifiers: [], key: "enter" }} />
        )}
        {props.item.link && (
          <Action.OpenInBrowser
            url={props.item.link}
            title="Open ADS Link in Browser"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        )}
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy ADS Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
        {props.item.uid && (
          <Action.CopyToClipboard
            content={props.item.uid}
            title="Copy ADS key"
            shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
