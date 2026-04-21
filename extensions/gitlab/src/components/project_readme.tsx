import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";

export function ProjectReadmeDetail(props: { project: Project }) {
  const [readme, setReadme] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchReadme() {
      try {
        const content = await gitlab.getProjectReadme(props.project);
        setReadme(content);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    }

    fetchReadme();
  }, [props.project]);

  if (error) {
    return (
      <Detail
        navigationTitle={`Readme - ${props.project.name}`}
        markdown={`## ⚠️ Error\n\n${error}`}
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
