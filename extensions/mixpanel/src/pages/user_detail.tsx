import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import dayjs from "dayjs";
import relativetime from "dayjs/plugin/relativeTime";
import MixpanelUser from "../model/user";
import { BASE_URL } from "../model/api";

export default function UserDetail(props: { user: MixpanelUser }) {
  const prefs = getPreferenceValues<Preferences.Index>();
  dayjs.extend(relativetime);

  const time = props.user.last_seen === "N/A" ? "N/A" : dayjs(props.user.last_seen).fromNow();

  return (
    <Detail
      markdown={`# ${props.user.name}`}
      navigationTitle={props.user.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`${BASE_URL}/project/${prefs.project_id}/view/123/app/profile#distinct_id=${props.user.id}`}
            title="Open Mixpanel Profile"
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Email" text={props.user.email} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Last seen" text={time} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Android app version" text={props.user.android_app_version} />
          <Detail.Metadata.Label title="iOS app version" text={props.user.ios_app_version} />
        </Detail.Metadata>
      }
    />
  );
}
