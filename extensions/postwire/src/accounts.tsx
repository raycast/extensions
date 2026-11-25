import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { call, link, nameOf, networksOf } from "./postwire";

const TAKES = { text: "Text, pictures and video", photo_or_video: "Pictures and video", video: "Video only" };

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { data, isLoading } = usePromise(() => call(apiKey, "GET", "/api/connections"));
  const code = data ? data.code : 200;
  const networks = data ? networksOf(data.body) : [];

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Connect a Social Account" url={link("connect")} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connected accounts…">
      {data && networks.length === 0 ? (
        <List.EmptyView
          icon={code === 200 ? Icon.Link : Icon.Warning}
          title={
            code === 200
              ? "No Accounts Connected Yet"
              : code === 401
                ? "PostWire Did Not Accept the API Key"
                : "Could Not Reach PostWire"
          }
          description={code === 200 ? "Press Enter to connect your social accounts in PostWire." : undefined}
          actions={actions}
        />
      ) : null}
      {networks.map((n) => (
        <List.Item
          key={n.platform}
          icon={Icon.CheckCircle}
          title={nameOf(n.platform)}
          accessories={[{ text: TAKES[n.needs] }]}
          actions={actions}
        />
      ))}
    </List>
  );
}
