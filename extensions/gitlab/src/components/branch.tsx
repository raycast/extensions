import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Branch, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { hashRecord, copyShortcut } from "../utils";
import {
  CreateBranchAction,
  CreateMRAction,
  RemoveBranchAction,
  RenameBranchAction,
  ShowBranchCommitsAction,
} from "./branch_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { usePaginatedBranches } from "./branches_data";

export function BranchListItem(props: { branch: Branch; project: Project; onRefresh?: () => void }) {
  return (
    <List.Item
      id={props.branch.name}
      title={props.branch.name}
      subtitle={props.branch.commit?.title}
      icon={{ source: GitLabIcons.branches, tintColor: Color.SecondaryText }}
      accessories={[
        ...(props.branch.default ? [{ tag: { value: "Default" }, tooltip: "Default branch for the project" }] : []),
        ...(props.branch.protected
          ? [
              {
                icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
                tooltip: "Protected branch",
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowBranchCommitsAction project={props.project} branch={props.branch} />
            <GitLabOpenInBrowserAction url={props.branch.web_url} />
            <Action.CopyToClipboard title="Copy Branch Name" content={props.branch.name} shortcut={copyShortcut} />
            <CreateMRAction project={props.project} branch={props.branch} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CreateBranchAction project={props.project} branch={props.branch} onFinished={props.onRefresh} />
            <RenameBranchAction project={props.project} branch={props.branch} onFinished={props.onRefresh} />
            <RemoveBranchAction project={props.project} branch={props.branch} onFinished={props.onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function BranchList(props: { project: Project; navigationTitle?: string }) {
  const [search, setSearch] = useState("");
  const { branches, isLoading, pagination, performRefetch } = usePaginatedBranches({
    project: props.project,
    search,
    cacheKey: `branches_${props.project.id}_${hashRecord({ search })}`,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      pagination={pagination}
      throttle={true}
      navigationTitle={props.navigationTitle}
    >
      {branches.map((branch) => (
        <BranchListItem key={branch.name} branch={branch} project={props.project} onRefresh={performRefetch} />
      ))}
    </List>
  );
}
