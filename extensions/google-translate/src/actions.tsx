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

export const ConfigurableCopyPasteActions = ({ defaultActionsPrefix, value }: ActionsOpts) => {
  const defaultPreference = getPreferenceValues<Preferences>().defaultAction;

  const pasteAction = (
    <Action.Paste title={defaultActionsPrefix ? `Paste ${defaultActionsPrefix}` : `Paste`} content={value} />
  );
  const copyAction = (
    <Action.CopyToClipboard title={defaultActionsPrefix ? `Copy ${defaultActionsPrefix}` : `Copy`} content={value} />
  );

  if (defaultPreference === DefaultActionPreference.PasteToApp) {
    return (
      <>
        {pasteAction}
        {copyAction}
      </>
    );
  }

  return (
    <>
      {copyAction}
      {pasteAction}
    </>
  );
};
