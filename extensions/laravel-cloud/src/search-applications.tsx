import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listApplications } from "./api/applications";
import { Application } from "./types/application";
import { getRegionLabel } from "./utils/regions";
import { timeAgo } from "./utils/dates";
import EnvironmentList from "./components/environment-list";

export default function SearchApplications() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(
    (query: string) => listApplications(query ? { name: query } : undefined, "environments"),
    [searchText],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search applications..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {data?.data.map((app) => (
        <ApplicationListItem key={app.id} application={app} />
      ))}
    </List>
  );
}

function ApplicationListItem({ application }: { application: Application }) {
  const { attributes } = application;
  const envCount = application.relationships?.environments?.data?.length ?? 0;

  return (
    <List.Item
      icon={attributes.avatar_url ? { source: attributes.avatar_url } : Icon.Globe}
      title={attributes.name}
      subtitle={attributes.repository?.full_name}
      accessories={[
        { text: getRegionLabel(attributes.region), icon: Icon.Map },
        { text: `${envCount} env${envCount !== 1 ? "s" : ""}` },
        { text: timeAgo(attributes.created_at), tooltip: attributes.created_at ?? undefined },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Environments"
            icon={Icon.List}
            target={<EnvironmentList applicationId={application.id} applicationName={attributes.name} />}
          />
          <Action.OpenInBrowser title="Open in Laravel Cloud" url={`https://cloud.laravel.com/${attributes.slug}`} />
          <Action.CopyToClipboard
            title="Copy Application ID"
            content={application.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
