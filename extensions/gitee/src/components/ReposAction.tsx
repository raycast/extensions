import { Repository } from "../types/repository";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { ReposDetail } from "./ReposDetail";
import { ActionToGitee } from "./ActionToGitee";
import React from "react";

export function ReposAction(props: { repo: Repository; showDetail: boolean }) {
  const { repo, showDetail } = props;
  return (
    <>
      <ActionPanel.Section title={repo.human_name}>
        {showDetail && <Action.Push icon={Icon.Sidebar} title={"Show Detail"} target={<ReposDetail repo={repo} />} />}
        <Action.OpenInBrowser url={repo.html_url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Repository URL"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          content={repo.html_url}
        />
        <Action.CopyToClipboard
          title={"Copy Clone Command"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
          content={"git clone " + repo.html_url}
        />
        <Action.CopyToClipboard
          title={"Copy Name with Owner"}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "." }}
          content={repo.full_name}
        />
        <Action.CopyToClipboard title={"Copy Repository Name"} content={repo.name} />
        <Action.CopyToClipboard title={"Copy Repository Owner"} content={repo.owner.name} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionToGitee />
      </ActionPanel.Section>
    </>
  );
}
