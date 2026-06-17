import { AboutMarkdown, AboutNavigationTitle } from "../../utils/constants";
import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

import HomeAction from "../actions/HomeAction";

const About = () => {
  return (
    <Detail
      navigationTitle={AboutNavigationTitle}
      markdown={AboutMarkdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <HomeAction />
        </ActionPanel>
      }
    />
  );
};

export default About;
