import { List } from "@raycast/api";

import { GitpodIcons } from "../../constants";

export const errorMessage = {
  invalidAccessToken: "Set valid Gitpod access token in Preferences",
  networkError: "Please check your internet connection.",
};

interface errorParams {
  message: string;
}

export const ErrorListView = ({ message }: errorParams) => {
  return (
    <List>
      <List.EmptyView icon={GitpodIcons.gitpod_logo_secondary} title={message} />
    </List>
  );
};
