import type { Blob, Project } from "./types";

import { Action, ActionPanel, showToast, Detail, getPreferenceValues, Toast, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ProjectDetail } from "./components/project-detail";

export interface Props {
  project: Project;
}

export function Project(props: { project: Project }) {
  const { id, name, head } = props.project;
  const preferences = getPreferenceValues();
  const httpdUrl = new URL(preferences.httpdAddress);
  const node = httpdUrl.port ? `${httpdUrl.hostname}:${httpdUrl.port}` : httpdUrl.hostname;
  const readme = useFetch<Blob>(`${preferences.httpdAddress}/api/v1/projects/${id}/readme/${head}`);

  if (readme.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Not able to update info",
      message: `Radicle HTTPD not found, trying to fetch from ${preferences.httpdAddress}`,
    });
  }

  return (
    <Detail
      navigationTitle="Show a project"
      isLoading={readme.isLoading}
      markdown={readme.data?.content || ""}
      actions={
        <ActionPanel title={name}>
          <Action.OpenInBrowser url={`${preferences.webUrl}/nodes/${node}/${id}`} />
          <Action.CopyToClipboard title="Copy Repository Id to Clipboard" content={id} />
          <Action
            icon={Icon.Repeat}
            title="Update Information"
            onAction={() => {
              readme.revalidate();
            }}
          />
        </ActionPanel>
      }
      metadata={<ProjectDetail project={props.project} />}
    />
  );
}
