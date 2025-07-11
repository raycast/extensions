import { ActionPanel } from "@raycast/api";
import { ReactElement } from "react";
import { ActionType } from "../models/actionType";
import { CommitMessage } from "../models/commitMessage";
import { OnSelection } from "../models/onSelection";
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

export default function CustomActionPannel({ commit, preferences }: CustomActionProps) {
  const mainActionType =
    preferences.onSelection === OnSelection.COPY
      ? ActionType.COPY
      : preferences.onSelection === OnSelection.PASTE
        ? ActionType.PASTE
        : ActionType.ALL;

  const mainActionTitle =
    preferences.onSelection === OnSelection.COPY
      ? "Copy to Clipboard"
      : preferences.onSelection === OnSelection.PASTE
        ? "Paste in Active App"
        : "Paste and Copy to Clipboard";

  const commitContent = commit.contentAction ?? commit.message;

  return (
    <ActionPanel>
      <CustomAction type={mainActionType} title={mainActionTitle} content={commitContent} />

      <ActionPanel.Section>
        {preferences.onSelection === OnSelection.COPY ? (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={ActionType.PASTE}
              content={commitContent}
              title="Paste Message"
              shortcut={getShortcut(ShortcutType.PASTE_MESSAGE)}
            />
          </BodyActionsWrapper>
        ) : preferences.onSelection === OnSelection.PASTE ? (
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
