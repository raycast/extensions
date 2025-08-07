import { ActionPanel, List, Image, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project } from "../gitlabapi";
import { gitlab } from "../common";
import { GitLabIcons } from "../icons";
import { CreateMRAction, ShowBranchCommitsAction } from "./branch_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { useCommitStatus } from "./commits/utils";
import { getCIJobStatusIcon } from "./jobs";
import { capitalizeFirstLetter, showErrorToast } from "../utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

function getIcon(merged: boolean): Image {
  if (merged) {
    return { source: GitLabIcons.merged, tintColor: Color.Purple };
  } else {
    return { source: GitLabIcons.mropen, tintColor: Color.Green };
  }
}

export function BranchListItem(props: { branch: any; project: Project }) {
  const branch = props.branch;
  const icon = getIcon(branch.merged as boolean);
  const isMergedStatus = branch.merged === true ? "Merged" : "Open";
  const project = props.project;
  const states = [];
  if (branch.default) {
    states.push("[default]");
  }
  if (branch.protected) {
    states.push("[protected]");
  }
  const { commitStatus } = useCommitStatus(project.id, branch?.commit?.id);
  const statusIcon = commitStatus ? getCIJobStatusIcon(commitStatus.status, commitStatus.allow_failure) : undefined;

  return (
    <List.Item
      id={branch.id}
      title={branch.name}
      subtitle={states.join(" ")}
      icon={{ value: icon, tooltip: `Status: ${isMergedStatus}` }}
      accessories={[
        {
          icon: statusIcon,
          tooltip: commitStatus?.status ? `Status: ${capitalizeFirstLetter(commitStatus.status)}` : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <ShowBranchCommitsAction projectID={project.id} branch={branch} />
          <CreateMRAction project={project} branch={branch} />
          <GitLabOpenInBrowserAction url={branch.web_url} />
        </ActionPanel>
      }
    />
  );
}

export function BranchList(props: { project: Project; navigationTitle?: string }) {
  const [query, setQuery] = useState<string>("");
  const { branches, error, isLoading } = useSearch(query, props.project);
  if (error) {
    showErrorToast(error, "Cannot search Branches");
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle={true} navigationTitle={props.navigationTitle}>
      <List.Section title="Branches">
        {branches?.map((branch, index) => (
          <BranchListItem key={index} branch={branch} project={props.project} />
        ))}
      </List.Section>
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  project: Project,
): {
  branches: any[];
  error?: string;
  isLoading: boolean;
} {
  const [branches, setBranches] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glData =
          (await gitlab.fetch(`projects/${project.id}/repository/branches`, { search: query || "" })) || [];
        if (!didUnmount) {
          setBranches(glData);
        }
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, project]);

  return { branches, error, isLoading };
}
