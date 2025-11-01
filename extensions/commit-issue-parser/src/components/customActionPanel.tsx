import { ActionPanel } from "@raycast/api";
import { ReactElement } from "react";
import { CommitMessage } from "../models/commitMessage";
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
        type={"paste"}
        content={bodyContent}
        title="Paste Body"
        shortcut={getShortcut(ShortcutType.PASTE_BODY)}
      />
      <CustomAction
        type={"copy"}
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
  const mainActionTitle =
    preferences.primaryAction === "copy"
      ? "Copy to Clipboard"
      : preferences.primaryAction === "paste"
        ? "Paste in Active App"
        : "Paste and Copy to Clipboard";

  const commitContent = commit.contentAction ?? commit.message;

  return (
    <ActionPanel>
      <CustomAction type={preferences.primaryAction} title={mainActionTitle} content={commitContent} />

      <ActionPanel.Section>
        {preferences.primaryAction === "copy" ? (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={"paste"}
              content={commitContent}
              title="Paste Message"
              shortcut={getShortcut(ShortcutType.PASTE_MESSAGE)}
            />
          </BodyActionsWrapper>
        ) : preferences.primaryAction === "paste" ? (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={"copy"}
              content={commitContent}
              title="Copy Message"
              shortcut={getShortcut(ShortcutType.COPY_MESSAGE)}
            />
          </BodyActionsWrapper>
        ) : (
          <BodyActionsWrapper bodyContent={commit.body}>
            <CustomAction
              type={"paste"}
              content={commitContent}
              title="Paste Message"
              shortcut={getShortcut(ShortcutType.PASTE_MESSAGE)}
            />
            <CustomAction
              type={"copy"}
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
