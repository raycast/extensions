import { Action, ActionPanel, Color, Icon, Image, ImageLike, List, useNavigation } from "@raycast/api";
import { AppBuild } from "@youri-kane/heroku-client/dist/requests/appBuilds/types";
import useSWR from "swr";
import heroku, { simplifyCustomResponse } from "./heroku";
import gravatar from "gravatar";

const getBuildAccessoryIcon = ({ status }: { status: AppBuild["status"] }): ImageLike => {
  switch (status) {
    case "succeeded":
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Gear, tintColor: Color.Blue };
  }
};

const groupByDate = (builds: AppBuild[]) => {
  const groups: AppBuild[][] = [];

  builds
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach((build, index) => {
      const date = new Date(build.created_at).toLocaleDateString();
      if (index === 0 || date !== new Date(builds[index - 1].created_at).toLocaleDateString()) {
        groups.push([build]);
      } else {
        groups[groups.length - 1].push(build);
      }
    });

  return groups;
};

export default function AppBuilds({ appId }: { appId: string }) {
  const { data, error } = useSWR("builds", () =>
    heroku.requests.getAppBuilds({ params: { appId } }).then(simplifyCustomResponse)
  );

  if (!data) {
    return <List isLoading />;
  }

  return (
    <List>
      {groupByDate(data).map((builds) => {
        const build = builds[0];
        const dateString = new Date(build.created_at).toLocaleDateString();

        return (
          <List.Section key={dateString} title={dateString}>
            {builds.map((build) => (
              <List.Item
                title={`${new Date(build.created_at).toLocaleDateString()}`}
                subtitle={build.stack}
                key={build.id}
                accessoryIcon={{
                  source: gravatar.url(build.user.email, {}, true),
                  mask: Image.Mask.Circle,
                }}
                accessoryTitle={new Date(build.created_at).toLocaleString()}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={build.output_stream_url} title="Open Build Output" />
                  </ActionPanel>
                }
                icon={getBuildAccessoryIcon(build)}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
