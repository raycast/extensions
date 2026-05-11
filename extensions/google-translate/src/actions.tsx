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

export const ToggleFullTextAction: React.FC<{
  onAction: () => void;
}> = ({ onAction }) => {
  return (
    <Action
      title="Toggle Full Text"
      icon={Icon.Text}
      onAction={onAction}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
    />
  );
};

export const OpenOnGoogleTranslateWebsiteAction: React.FC<{
  translation: Pick<SimpleTranslateResult, "langFrom" | "langTo">;
  translationText: string;
}> = ({ translationText, translation }) => {
  return (
    <Action.OpenInBrowser
      title="Open in Google Translate"
      shortcut={{ macOS: { modifiers: ["opt"], key: "enter" }, Windows: { modifiers: ["alt"], key: "enter" } }}
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
