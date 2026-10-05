import { ActionPanel } from "@raycast/api";
import { PinAnswerAction } from "./index";

/** Pins the conversation the selected answer belongs to. See `PinAnswerAction`. */
export const PinActionSection = ({
  onPinAnswerAction,
  isPinned,
}: {
  onPinAnswerAction: () => void;
  isPinned: boolean;
}) => (
  <ActionPanel.Section title="Pin">
    <PinAnswerAction onAction={onPinAnswerAction} isPinned={isPinned} />
  </ActionPanel.Section>
);
