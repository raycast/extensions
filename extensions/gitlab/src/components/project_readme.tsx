import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";

export function ProjectReadmeDetail(props: { project: Project }) {
  const {
    data: readme,
    error,
    isLoading,
  } = usePromise((project: Project) => gitlab.getProjectReadme(project), [props.project]);

  if (error) {
    return (
      <Detail
        navigationTitle={`Readme - ${props.project.name}`}
        markdown={`## ⚠️ Error\n\n${getErrorMessage(error)}`}
        actions={
          <ActionPanel>
            <GitLabOpenInBrowserAction title="Open Readme in Browser" url={props.project.readme_url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      navigationTitle={`Readme - ${props.project.name}`}
      isLoading={isLoading}
      markdown={readme || ""}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction title="Open Readme in Browser" url={props.project.readme_url} />
          <Action.CopyToClipboard title="Copy Readme Content" content={readme || ""} />
        </ActionPanel>
      }
    />
  );
}
