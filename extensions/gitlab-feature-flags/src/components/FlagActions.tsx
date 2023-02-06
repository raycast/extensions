import { Action, ActionPanel, Icon } from "@raycast/api";
import getEventsUrl from "../helpers/getEventsUrl";
import { Flag } from "../types";

function FlagActions(flag: Flag) {
  return (
    <ActionPanel title={flag.name}>
      <Action.OpenInBrowser title="Event History" icon={Icon.Receipt} url={getEventsUrl(flag.name)} />
      <Action.CopyToClipboard title="Copy flag name" content={flag.name} />
      <Action.OpenInBrowser
        title="Open yaml in browser"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        url={flag.web_url}
      />
      {flag.rollout_issue_url ? (
        <Action.OpenInBrowser
          title="Open Rollout Issue"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          url={flag.rollout_issue_url}
        />
      ) : null}
      {flag.introduced_by_url ? (
        <Action.OpenInBrowser
          title="Open Intoduced MR"
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          url={flag.introduced_by_url}
        />
      ) : null}
    </ActionPanel>
  );
}

export default FlagActions;
