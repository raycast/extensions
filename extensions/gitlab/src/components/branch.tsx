import { ActionPanel, List, OpenInBrowserAction, Image, Color, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project } from "../gitlabapi";
import { gitlab } from "../common";
import { GitLabIcons } from "../icons";
import { CreateMRAction } from "./branch_actions";

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
  const states = [];
  if (branch.default) {
    states.push("[default]");
  }
  if (branch.protected) {
    states.push("[protected]");
  }
  return (
    <List.Item
      id={branch.id}
      title={branch.name}
      subtitle={states.join(" ")}
      icon={icon}
      actions={
        <ActionPanel>
          <CreateMRAction project={props.project} branch={branch} />
          <OpenInBrowserAction url={branch.web_url} />
        </ActionPanel>
      }
    />
  );
}

export function BranchList(props: { project: Project }) {
  const [query, setQuery] = useState<string>("");
  const { branches, error, isLoading } = useSearch(query, props.project);
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search branches", error);
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle={true} navigationTitle="Branches">
      {branches?.map((branch, index) => (
        <BranchListItem key={index} branch={branch} project={props.project} />
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  project: Project
): {
  branches: any[];
  error?: string;
  isLoading: boolean;
} {
  const [branches, setBranches] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
