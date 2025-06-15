import type { Project } from "./types";

import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ProjectListItem } from "./components/project-list-item";

export default function Command() {
  const p = getPreferenceValues();
  const { isLoading, error, data } = useFetch<Project[]>(`${p.httpdAddress}/api/v1/projects?perPage=500&show=all`);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Not able to update project listing",
      message: `Radicle HTTPD not found, trying to fetch from ${p.httpdAddress}`,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {data?.length === 0 ? (
        <List isLoading={isLoading}>
          <List.EmptyView icon="notfound.svg" title="No project in your storage found." />
        </List>
      ) : (
        data?.map((p) => <ProjectListItem key={p.id} project={p} />)
      )}
    </List>
  );
}
