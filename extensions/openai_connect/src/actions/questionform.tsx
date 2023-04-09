import PromptForm from "../components/promptform";
import { ChatHook, ModelHook } from "../types";
import type { Conversation, FormInputActionProps } from "../types";
import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { FC } from "react";

export const FormInputActionSection: FC<FormInputActionProps> = ({ question, chats, models, conversation }) => {
  const { push } = useNavigation();

  return (
    <ActionPanel.Section title="Input">
      <Action
        title="Full Text Input"
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        icon={Icon.Text}
        onAction={() => {
          push(<PromptForm initQuestion={question} chats={chats} models={models} conversation={conversation} />);
        }}
      />
    </ActionPanel.Section>
  );
};
