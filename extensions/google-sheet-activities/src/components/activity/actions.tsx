import { Action, Icon } from "@raycast/api";

import { Activity } from "../../services";
import { preferences } from "../../config";

export type ActivityActionsProps = { activity: Activity };

export const ActivityActions = ({ activity }: ActivityActionsProps) => {
  return (
    <>
      <Action.OpenInBrowser url={`https://docs.google.com/spreadsheets/d/${preferences.sheetId}/edit#gid=0`} />

      <Action.OpenInBrowser
        title="Send Email"
        url={`mailto:${activity.email}`}
        icon={Icon.Reply}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />

      <Action.OpenInBrowser
        title="Dial Cellphone"
        url={`tel:${activity.cellPhone}`}
        icon={Icon.PhoneRinging}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />

      <Action.OpenInBrowser
        title="Dial Work Phone"
        url={`tel:${activity.workPhone}`}
        icon={Icon.PhoneRinging}
        shortcut={{ modifiers: ["cmd"], key: "w" }}
      />

      <Action.CopyToClipboard
        title="Copy Email"
        content={activity.email}
        shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
      />

      <Action.CopyToClipboard
        title="Copy Cellphone"
        content={activity.cellPhone}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />

      <Action.CopyToClipboard
        title="Copy Work Phone"
        content={activity.workPhone}
        shortcut={{ modifiers: ["cmd", "opt"], key: "w" }}
      />
    </>
  );
};
