import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const AM_CONTRIBUTION_PERCENTAGE = 8;

export const copyAction = ({ content }: { content: string }) => <Action.CopyToClipboard content={content} />;
export const pasteAction = ({ content }: { content: string }) => <Action.Paste content={content} />;

export const Actions = ({ content }: { content: string }) => (
  <ActionPanel>
    {preferences.defaultAction === "copy" ? copyAction({ content }) : pasteAction({ content })}
    {preferences.defaultAction === "paste" ? pasteAction({ content }) : copyAction({ content })}
  </ActionPanel>
);
