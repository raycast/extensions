import {
  ActionPanel,
  Application,
  CopyToClipboardAction,
  List,
  OpenWithAction,
  ShowInFinderAction,
} from "@raycast/api";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";
import React, { useMemo } from "react";
import { AppHistory, recentEntry } from "../util";
import { OpenInJetBrainsAppAction } from "./OpenInJetBrainsAppAction";

interface RecentProjectProps {
  app: AppHistory;
  recent: recentEntry;
  tools: AppHistory[];
  toolbox: Application;
}

export function RecentProject({ app, recent, tools, toolbox }: RecentProjectProps): JSX.Element {
  const otherTools = tools.filter((tool) => tool.title !== app.title);

  const keywords = useMemo(() => {
    const splitPath = recent.path.split("/");
    return [
      ...new Set(
        [
          recent.path,
          ...splitPath,
          ...splitPath.map((pathSegment) => pathSegment.split("-").join(" ")),
          ...splitPath.map((pathSegment) => pathSegment.split("_").join(" ")),
          app.title,
        ].filter((keyword) => !!keyword)
      ),
    ];
  }, [recent.path, app.title]);

  return (
    <List.Item
      accessoryTitle={app.title}
      title={recent.title}
      keywords={keywords}
      icon={recent.icon}
      subtitle={recent.parts}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJetBrainsAppAction tool={app} recent={recent} />
            <ShowInFinderAction path={recent.path} />
            {recent.exists ? <OpenWithAction path={recent.path} /> : null}
            <CopyToClipboardAction
              title="Copy Path"
              content={recent.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {otherTools.map((tool) => (
              <OpenInJetBrainsAppAction key={`${tool.title}-${recent.path}`} tool={tool} recent={recent} />
            ))}
            <OpenJetBrainsToolbox app={toolbox} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
