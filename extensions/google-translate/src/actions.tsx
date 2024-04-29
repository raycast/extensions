import React from "react";
import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";

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

export function getActions({
  value,
  defaultActionsPrefix,
  firstSectionTitle,
  otherActions,
  otherSections,
}: ActionsOpts) {
  const defaultPreference = getPreferenceValues<Preferences>().defaultAction;
  const action = [
    <Action.CopyToClipboard
      title={defaultActionsPrefix ? `Copy ${defaultActionsPrefix}` : `Copy`}
      key={DefaultActionPreference.CopyToClipboard}
      content={value}
    />,
    <Action.Paste
      title={defaultActionsPrefix ? `Paste ${defaultActionsPrefix}` : `Paste`}
      key={DefaultActionPreference.PasteToApp}
      content={value}
    />,
  ];
  const defaultAction = action.find((action) => action.key === defaultPreference);
  const secondaryAction = action.filter((action) => action.key !== defaultPreference);

  return (
    <ActionPanel>
      <ActionPanel.Section title={firstSectionTitle}>
        <>
          {defaultAction}
          {secondaryAction}
          {otherActions}
        </>
      </ActionPanel.Section>
      <>{otherSections}</>
    </ActionPanel>
  );
}
