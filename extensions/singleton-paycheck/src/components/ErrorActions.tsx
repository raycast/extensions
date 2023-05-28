import { Action, ActionPanel, openExtensionPreferences } from "@raycast/api";
import { Component } from "react";

export default class ErrorActions extends Component<any, any> {
  render() {
    return (
      <ActionPanel>
        <Action
          title="Open Extension Preferences"
          onAction={openExtensionPreferences}
        />
      </ActionPanel>
    );
  }
}
