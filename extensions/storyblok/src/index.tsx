import { ActionPanel, Detail, List, Action, Icon, getPreferenceValues } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import StoriesList from "./storiesList";
import SpaceDetail from "./spaceDetail";
import CollaboratorsList from "./collaboratorsList";
import AssetList from "./assetList";
import Activities from "./activities";
import { space } from "./utils/types";
import { dateIcon, planLevel } from "./utils/helpers";

const preferences = getPreferenceValues<Preferences>();
const shortcutKey = preferences.modifierKey ?? "ctrl";

interface spaceData {
  spaces: space[];
}

export default function Command() {
  const data = sbData<spaceData>("spaces");

  if (data.isLoading) {
    return <Detail isLoading={data.isLoading} markdown={`Loading your Storyblok spaces...`} />;
  }

  if (!data.data) {
    return (
      <Detail
        isLoading={false}
        markdown={`# Unauthorized request. \n Your Storyblok Personal Access Token is invalid. You can generate a new one under your [Account Settings in Storyblok here](https://app.storyblok.com/me/account?tab=token#/me/account?tab=token).`}
      />
    );
  }

  return (
    <List isLoading={data.isLoading}>
      {data.data?.spaces?.map((space: space) => (
        <List.Item
          icon={Icon.Folder}
          key={space.id}
          title={space.name}
          accessories={[
            { date: new Date(space.updated_at), icon: dateIcon(new Date(space.updated_at)), tooltip: "Last updated:" },
            { text: { value: `${space.id}` }, icon: Icon.Info, tooltip: "Space ID:" },
            planLevel(space.plan_level),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://app.storyblok.com/#/me/spaces/${space.id}/dashboard`} />
              <Action.Push
                title="Space Details"
                icon={Icon.AppWindowList}
                target={<SpaceDetail spaceId={space.id} />}
              />
              <Action.Push
                title="Stories"
                icon={Icon.Book}
                target={<StoriesList spaceId={space.id} />}
                shortcut={{ modifiers: [shortcutKey], key: "s" }}
              />
              <Action.Push
                title="Assets"
                icon={Icon.Image}
                target={<AssetList spaceId={space.id} />}
                shortcut={{ modifiers: [shortcutKey], key: "a" }}
              />
              <Action.Push
                title="Collaborators"
                icon={Icon.Person}
                target={<CollaboratorsList spaceId={space.id} />}
                shortcut={{ modifiers: [shortcutKey], key: "c" }}
              />
              <Action.Push
                title="Activity"
                icon={Icon.Tray}
                target={<Activities spaceId={space.id} />}
                shortcut={{ modifiers: [shortcutKey], key: "v" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
