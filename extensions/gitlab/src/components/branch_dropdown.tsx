import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { Project } from "../gitlabapi";
import { fetchBranchNames } from "./branches_gql";

export function BranchDropdown(props: {
  project: Project;
  value: string;
  onChange: (branch: string) => void;
  storeValue?: boolean;
}): React.ReactNode {
  const projectRef = useRef(props.project);
  projectRef.current = props.project;

  const { data: branchNames, isLoading } = useCachedPromise(
    async (projectId: number): Promise<string[]> => {
      void projectId;
      return fetchBranchNames(projectRef.current);
    },
    [props.project.id],
    { initialData: [] as string[] },
  );

  const names = useMemo(() => {
    const uniqueNames = new Set(branchNames);
    if (props.value) {
      uniqueNames.add(props.value);
    }
    if (props.project.default_branch) {
      uniqueNames.add(props.project.default_branch);
    }
    return [...uniqueNames].sort((left, right) => {
      if (left === props.project.default_branch) {
        return -1;
      }
      if (right === props.project.default_branch) {
        return 1;
      }
      return left.localeCompare(right);
    });
  }, [branchNames, props.project.default_branch, props.value]);

  useEffect(() => {
    if (isLoading || branchNames.length === 0) {
      return;
    }
    if (props.value && names.includes(props.value)) {
      return;
    }
    const nextBranch =
      props.project.default_branch && names.includes(props.project.default_branch)
        ? props.project.default_branch
        : names[0];
    if (nextBranch !== props.value) {
      props.onChange(nextBranch);
    }
  }, [branchNames, isLoading, names, props.onChange, props.project.default_branch, props.project.id, props.value]);

  return (
    <List.Dropdown
      id={`project-branch-${props.project.id}`}
      tooltip="Branch"
      isLoading={isLoading}
      value={props.value && names.includes(props.value) ? props.value : (names[0] ?? (isLoading ? "__loading__" : ""))}
      storeValue={props.storeValue}
      onChange={props.onChange}
    >
      <List.Dropdown.Section>
        {names.length > 0 ? (
          names.map((name) => <List.Dropdown.Item key={name} value={name} title={name} />)
        ) : (
          <List.Dropdown.Item value="__loading__" title={isLoading ? "Loading branches…" : "No branches"} />
        )}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
