import { Action, ActionPanel, Icon } from "@raycast/api";
import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from "../lib/constants";

const CommonActions = () => {
  return (
    <ActionPanel.Section title="Extension feedback">
      <Action.OpenInBrowser title="Request Feature" icon={Icon.LightBulb} url={FEATURE_REQUEST_URL} />
      <Action.OpenInBrowser title="Open Bug Report" url={BUG_REPORT_URL} icon={Icon.Bug} />
    </ActionPanel.Section>
  );
};

export default CommonActions;
