import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import * as React from "react";
import { SetSettingsCommandChatByIndex } from "../../../settings/settings";
import { RaycastChat } from "../../../settings/types";

interface props {
  SetShow: React.Dispatch<React.SetStateAction<boolean>>;
  Chat: RaycastChat;
  ChatNameIndex: number;
  SetChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>;
  revalidate: CallableFunction;
}

interface FormData {
  name: string;
}

export function FormRenameChat(props: props): JSX.Element {
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      name: props.Chat.name,
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  const InfoName = "Chat Name";

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShow(false)} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    props.Chat.name = values.name;
    props.SetChat(props.Chat);
    await SetSettingsCommandChatByIndex(props.ChatNameIndex, props.Chat);
    await props.revalidate();
    props.SetShow(false);
  }

  return (
    <Form actions={ActionView}>
      <Form.TextField title="Name" info={InfoName} {...itemProps.name} />
    </Form>
  );
}
