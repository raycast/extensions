import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  Image,
  List,
} from "@raycast/api";
import { openPullRequests, spansOrgs, Update, useUpdates } from "./api";
import { TeamDropdown, teamIcon, useTeamFilter } from "./team-dropdown";
import { withAccessToken } from "@raycast/utils";
import { verwatch } from "./auth";
import { relative } from "./time";

const statusIcons: Record<Update["status"], Image.ImageLike> = {
  pending: { source: Icon.Clock, tintColor: Color.SecondaryText },
  processing: { source: Icon.CircleProgress50, tintColor: Color.Blue },
  completed: { source: Icon.CheckCircle, tintColor: Color.Green },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red },
  cancelled: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
};

function RecentUpdates() {
  const { data, isLoading, revalidate } = useUpdates(50);
  const teams = useTeamFilter();
  const updates = (data?.updates ?? []).filter(teams.includes).slice(0, 50);
  const showsOrg = spansOrgs(updates.map((update) => update.project));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter updates by project"
      searchBarAccessory={
        <TeamDropdown teams={data?.teams ?? []} onChange={teams.setTeam} />
      }
    >
      {updates.map((update) => {
        const open = openPullRequests(update);

        return (
          <List.Item
            key={`${update.team.slug}/${update.id}`}
            icon={{ value: statusIcons[update.status], tooltip: update.status }}
            title={showsOrg ? update.project : update.project.split("/")[1]}
            subtitle={update.id}
            keywords={[update.project, update.status, update.team.name]}
            accessories={[
              ...(open.length > 0
                ? [
                    {
                      tag: {
                        value: `${open.length} PR to review`,
                        color: Color.Purple,
                      },
                    },
                  ]
                : []),
              ...(update.created_at
                ? [{ text: relative(update.created_at) }]
                : []),
              ...(teams.showsAll
                ? [{ tag: update.team.name, icon: teamIcon(update.team) }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in VerWatch"
                  url={update.url}
                />
                {update.pull_requests.map((pr) => (
                  <Action.OpenInBrowser
                    key={pr.url}
                    title={`Open PR #${pr.number} (${pr.state})`}
                    icon={Icon.Code}
                    url={pr.url}
                  />
                ))}
                <Action.CopyToClipboard
                  title="Copy Update URL"
                  content={update.url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withAccessToken(verwatch)(RecentUpdates);
