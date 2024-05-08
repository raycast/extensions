import React from "react";
import { Action, getPreferenceValues } from "@raycast/api";

interface ActionsOpts {
  value: string;
  defaultActionsPrefix?: string;
}

export const ConfigurableCopyPasteActions = ({ defaultActionsPrefix, value }: ActionsOpts) => {
  const defaultPreference = getPreferenceValues<ExtensionPreferences>().defaultAction;

  const pasteAction = (
    <Action.Paste title={defaultActionsPrefix ? `Paste ${defaultActionsPrefix}` : `Paste`} content={value} />
  );
  const copyAction = (
    <Action.CopyToClipboard title={defaultActionsPrefix ? `Copy ${defaultActionsPrefix}` : `Copy`} content={value} />
  );

  if (defaultPreference === "paste") {
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
