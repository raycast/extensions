import { AboutMarkdown, AboutNavigationTitle } from "../../utils/constants";
import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

import HomeAction from "../actions/HomeAction";

interface AboutProps {
  previousViewTitle?: string;
}

const About = ({ previousViewTitle = "" }: AboutProps) => {
  return (
    <Detail
      navigationTitle={`${previousViewTitle}${AboutNavigationTitle}`}
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
