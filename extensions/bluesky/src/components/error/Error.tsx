import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

import { ErrorMessageBody } from "../../utils/constants";
import HomeAction from "../actions/HomeAction";

interface ErrorProps {
  navigationTitle: string;
  errorMessage: string;
}

const Error = ({ errorMessage, navigationTitle }: ErrorProps) => {
  const markdown = `## Error: ${errorMessage}

${ErrorMessageBody}
  `;

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <HomeAction />
        </ActionPanel>
      }
    />
  );
};

export default Error;
