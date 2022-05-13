import {
  ActionPanel,
  Application,
  Action,
  CopyToClipboardAction,
  List,
  OpenWithAction,
  ShowInFinderAction,
} from "@raycast/api";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";
import React from "react";
import { AppHistory, recentEntry } from "../util";
import { OpenInJetBrainsApp } from "./OpenInJetBrainsApp";

interface RecentProjectProps {
  app: AppHistory;
  recent: recentEntry;
  tools: AppHistory[];
  toolbox: Application;
}

export function RecentProject({ app, recent, tools, toolbox }: RecentProjectProps): JSX.Element {
  const otherTools = tools.filter((tool) => tool.title !== app.title);

  return (
    <List.Item
      accessoryTitle={app.title}
      title={recent.title}
      keywords={recent.path.split("/").concat([recent.path]).concat([app.title])}
      icon={recent.icon}
      subtitle={recent.parts}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJetBrainsApp tool={app} recent={recent} />
            <Action.ShowInFinder path={recent.path} />
            {recent.exists ? <Action.OpenWith path={recent.path} /> : null}
            <Action.CopyToClipboard
              title="Copy Path"
              content={recent.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {otherTools.map((tool) => (
              <OpenInJetBrainsApp key={`${tool.title}-${recent.path}`} tool={tool} recent={recent} />
            ))}
            <OpenJetBrainsToolbox app={toolbox} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
