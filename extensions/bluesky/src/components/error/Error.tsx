import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

import { ErrorMessageBody } from "../../utils/constants";
import HomeAction from "../actions/HomeAction";

interface ErrorProps {
  navigationTitle: string;
  errorMessage: string;
  showErrorBody?: boolean;
}

const Error = ({ errorMessage, navigationTitle, showErrorBody = true }: ErrorProps) => {
  const errorBody = showErrorBody ? ErrorMessageBody : "";
  const markdown = `## Error: ${errorMessage}

${errorBody}
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
