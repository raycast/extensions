import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Details } from "./details";
import { getBundlephobiaLink } from "../utils";
import * as React from "react";
import { Package } from "../types";

interface ListItemProps {
  data: Package;
}

export const ListItem = ({ data }: ListItemProps) => {
  return (
    <List.Item
      id={data.name}
      title={data.name}
      subtitle={data.description}
      accessories={[
        {
          text: data.version,
          icon: Icon.Terminal,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            target={<Details {...data} />}
            title="Show Details"
            icon={Icon.Sidebar}
          />
          <Action.OpenInBrowser url={getBundlephobiaLink(data.name)} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={getBundlephobiaLink(data.name)}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
};
