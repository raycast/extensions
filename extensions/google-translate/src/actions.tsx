import React from "react";
import { Action, getPreferenceValues } from "@raycast/api";

enum DefaultActionPreference {
  CopyToClipboard = "copy",
  PasteToApp = "paste",
}

interface Preferences {
  defaultAction?: DefaultActionPreference;
}

interface ActionsOpts {
  value: string;
  defaultActionsPrefix?: string;
  firstSectionTitle?: string;
  otherActions?: React.ReactElement[];
  otherSections?: React.ReactElement[];
}

export const ConfigurableAction = ({ defaultActionsPrefix, value }: ActionsOpts) => {
  const defaultPreference = getPreferenceValues<Preferences>().defaultAction;

  if (defaultPreference === DefaultActionPreference.PasteToApp) {
    return (
      <Action.Paste
        title={defaultActionsPrefix ? `Paste ${defaultActionsPrefix}` : `Paste`}
        key={DefaultActionPreference.PasteToApp}
        content={value}
      />
    );
  }

  // DefaultActionPreference.CopyToClipboard is default action
  return (
    <Action.CopyToClipboard
      title={defaultActionsPrefix ? `Copy ${defaultActionsPrefix}` : `Copy`}
      key={DefaultActionPreference.CopyToClipboard}
      content={value}
    />
  );
};
