import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useOrganizations } from "./hooks/use-organizations.js";
import { SkippedOrgsSection } from "./components/skipped-orgs-section.js";
import { buildOrgScenariosUrl, zoneLabel } from "./utils/url.js";

export default function SearchOrganizations() {
  const {
    data: items,
    isLoading,
    skippedOrgs,
    revalidate,
  } = useOrganizations();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search organizations...">
      {!isLoading && items.length === 0 && (
        <List.EmptyView
          title="No organizations found"
          description="Check your API token and zone in extension preferences."
          icon={Icon.MagnifyingGlass}
        />
      )}
      {items.map((item) => {
        const { org, team } = item;
        const url = buildOrgScenariosUrl(org.zone, team.id);

        return (
          <List.Item
            key={`${org.id}-${team.id}`}
            title={org.name}
            subtitle={team.name}
            accessories={[
              { tag: { value: zoneLabel(org.zone), color: Color.Blue } },
            ]}
            icon={Icon.Building}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Scenarios" url={url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <SkippedOrgsSection names={skippedOrgs} />
    </List>
  );
}
