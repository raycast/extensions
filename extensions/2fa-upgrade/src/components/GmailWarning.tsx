import { List, Icon, Color } from "@raycast/api";
import React from "react";

export const GmailWarning: React.FC = () => {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        title="Gmail Configuration Required"
        description="Please add your Gmail OAuth Client ID in the extension preferences or disable Mail Fetching as a source."
      />
    </List>
  );
};
