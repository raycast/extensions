import { Action, ActionPanel, Form, Icon, getPreferenceValues, LocalStorage } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { AddSettingsCommandChat, SetSettingsCommandChatByIndex } from "../../../settings/settings";
import { RaycastChat } from "../../../settings/types";
import { GetModels } from "../../function";
import { Preferences } from "../../../types";

interface props {
  SetShow: React.Dispatch<React.SetStateAction<boolean>>;
  Chat?: RaycastChat;
  ChatNameIndex?: number;
  SetChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>;
  SetChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: () => Promise<string[]>;
}

interface FormData {
  modelMain: string;
}

export function FormModel(props: props): JSX.Element {
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels);
  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    validation: {
      modelMain: FormValidation.Required,
    },
  });

  React.useEffect(() => {
    (async () => {
      if (!Model || !Model.get("GitHub")) return;
      const list = Model.get("GitHub")!;
      if (props.Chat) {
        const exists = list.some((m) => m.name === props.Chat!.models.main.tag);
        if (exists) setValue("modelMain", props.Chat.models.main.tag);
        return;
      }
      // No chat provided: preselect default model
      const prefs = getPreferenceValues<Preferences>();
      const cached = await LocalStorage.getItem<string>("github_default_model");
      const desired = cached || prefs.defaultModel || "openai/gpt-4.1";
      const found = list.find((m) => m.name === desired) || list[0];
      if (found) setValue("modelMain", found.name);
    })();
  }, [Model]);

  async function Submit(values: FormData): Promise<void> {
    let chat = props.Chat;
    if (chat && props.ChatNameIndex !== undefined) {
      chat.models.main = {
        server_name: "GitHub",
        server: { url: "https://models.github.ai" },
        tag: values.modelMain,
      } as any;
      await SetSettingsCommandChatByIndex(props.ChatNameIndex, chat).catch(async () => {
        await AddSettingsCommandChat(chat as RaycastChat);
        await props.revalidate();
      });
    } else {
      chat = {
        name: "New Chat",
        models: {
          main: { server_name: "GitHub", server: { url: "https://models.github.ai" }, tag: values.modelMain } as any,
        },
        messages: [],
      } as RaycastChat;
      await AddSettingsCommandChat(chat);
      await props.revalidate();
    }
    props.SetChat(chat);
    props.SetChatModelsAvailable(true);
    props.SetShow(false);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShow(false)} />
        </ActionPanel>
      }
      isLoading={IsLoadingModel}
    >
      {!IsLoadingModel && Model && (
        <Form.Dropdown title="Model" {...itemProps.modelMain}>
          {Model.get("GitHub")?.map((s) => (
            <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
