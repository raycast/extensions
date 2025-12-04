import { Action, ActionPanel } from "@raycast/api";
import { PrimaryAction } from "../components/primary-action";
import { PreferencesActionSection } from "../components/preferences-action-section";
import { getSelectModelActionPanel } from "./select-model";

export const getSendMessageActionPanel = ({
  onAction,
  preferences,
  currentQuestion,
  answer,
}: {
  onAction: () => void;
  preferences: Preferences;
  currentQuestion: string;
  answer: string;
}) => (
  <ActionPanel>
    {currentQuestion ? (
      <PrimaryAction title="Send Message" onAction={onAction} />
    ) : (
      <Action.CopyToClipboard content={answer} title="Copy Response" />
    )}
    <PreferencesActionSection />
    {getSelectModelActionPanel(preferences)}
  </ActionPanel>
);
