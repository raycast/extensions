import { ActionPanel } from "@raycast/api";
import { ReactElement } from "react";
import { ActionType } from "../models/actionType";
import { CommitMessage } from "../models/commitMessage";
import { Preferences } from "../models/preferences";
import { ShortcutType } from "../models/shortcutType";
import getShortcut from "../services/shortcut";
import CustomAction from "./customAction";

type BodyActionsWrapperProps = {
  children: ReactElement | ReactElement[];
  bodyContent?: string;
};

function BodyActionsWrapper({ children, bodyContent }: BodyActionsWrapperProps) {
  if (!bodyContent) return <>{children}</>;

  return (
    <>
      <CustomAction
        type={ActionType.PASTE}
        content={bodyContent}
        title="Paste Body"
        shortcut={getShortcut(ShortcutType.PASTE_BODY)}
      />
      <CustomAction
        type={ActionType.COPY}
        content={bodyContent}
        title="Copy Body"
        shortcut={getShortcut(ShortcutType.COPY_BODY)}
      />
      {children}
    </>
  );
}

type CustomActionProps = {
  commit: CommitMessage;
  preferences: Preferences;
};

export default function CustomActionPanel({ commit, preferences }: CustomActionProps) {
  const mainActionType =
    preferences.primaryAction === ActionType.COPY
      ? ActionType.COPY
      : preferences.primaryAction === ActionType.PASTE
        ? ActionType.PASTE
        : ActionType.COPY_AND_PASTE;

  const mainActionTitle =
    preferences.primaryAction === ActionType.COPY
      ? "Copy to Clipboard"
      : preferences.primaryAction === ActionType.PASTE
        ? "Paste in Active App"
        : "Paste and Copy to Clipboard";

  const commitContent = commit.contentAction ?? commit.message;

  return (
    <ActionPanel>
      <CustomAction type={mainActionType} title={mainActionTitle} content={commitContent} />

      <ActionPanel.Section>
        {preferences.primaryAction === ActionType.COPY ? (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={ActionType.PASTE}
              content={commitContent}
              title="Paste Message"
              shortcut={getShortcut(ShortcutType.PASTE_MESSAGE)}
            />
          </BodyActionsWrapper>
        ) : preferences.primaryAction === ActionType.PASTE ? (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={ActionType.COPY}
              content={commitContent}
              title="Copy Message"
              shortcut={getShortcut(ShortcutType.COPY_MESSAGE)}
            />
          </BodyActionsWrapper>
        ) : (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={ActionType.PASTE}
              content={commitContent}
              title="Paste Message"
              shortcut={getShortcut(ShortcutType.PASTE_MESSAGE)}
            />
            <CustomAction
              type={ActionType.COPY}
              content={commitContent}
              title="Copy Message"
              shortcut={getShortcut(ShortcutType.COPY_MESSAGE)}
            />
          </BodyActionsWrapper>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
