import React from "react";
import { Action, Icon, getPreferenceValues } from "@raycast/api";
import { SimpleTranslateResult } from "./simple-translate";

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

export const ToggleFullTextAction: React.VFC<{
  onAction: () => void;
}> = ({ onAction }) => {
  return (
    <Action title="Toggle Full Text" icon={Icon.Text} onAction={onAction} shortcut={{ modifiers: ["cmd"], key: "f" }} />
  );
};

export const OpenOnGoogleTranslateWebsiteAction: React.VFC<{
  translation: Pick<SimpleTranslateResult, "langFrom" | "langTo">;
  translationText: string;
}> = ({ translationText, translation }) => {
  return (
    <Action.OpenInBrowser
      title="Open in Google Translate"
      shortcut={{ modifiers: ["opt"], key: "enter" }}
      url={
        "https://translate.google.com/?sl=" +
        translation.langFrom +
        "&tl=" +
        translation.langTo +
        "&text=" +
        encodeURIComponent(translationText) +
        "&op=translate"
      }
    />
  );
};
