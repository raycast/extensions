import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { OllamaServer } from "../../../ollama/types";
import {
  AddSettingsCommandChat,
  GetOllamaServerByName,
  GetSettingsCommandChatNames,
  SetSettingsCommandChatByIndex,
} from "../../../settings/settings";
import { RaycastChat } from "../../../settings/types";
import { GetModelsName } from "../../function";
import { InfoKeepAlive } from "../../info";
import { ValidationKeepAlive } from "../../valitadion";

interface props {
  SetShow: React.Dispatch<React.SetStateAction<boolean>>;
  Chat?: RaycastChat;
  ChatNameIndex?: number;
  SetChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>;
  SetChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: () => Promise<string[]>;
}

interface FormData {
  serverMain: string;
  modelMain: string;
  keepAliveMain: string;
  serverVision: string;
  modelVision: string;
  keepAliveVision: string;
  serverEmbedding: string;
  modelEmbedding: string;
  keepAliveEmbedding: string;
}

export function FormModel(props: props): JSX.Element {
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModelsName, []);
  const [CheckboxMainAdvanced, SetCheckboxMainAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat && props.Chat.models.main.keep_alive ? true : false);
  const [CheckboxEmbedding, SetCheckboxEmbedding]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat?.models.embedding ? true : false);
  const [CheckboxEmbeddingAdvanced, SetCheckboxEmbeddingAdvanced]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = React.useState(props.Chat?.models.embedding && props.Chat.models.embedding.keep_alive ? true : false);
  const [CheckboxVision, SetCheckboxVision]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(
    props.Chat?.models.vision ? true : false
  );
  const [CheckboxVisionAdvanced, SetCheckboxVisionAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat?.models.vision && props.Chat.models.vision.keep_alive ? true : false);
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      serverMain: props.Chat ? props.Chat.models.main.server_name : undefined,
      modelMain: props.Chat ? props.Chat.models.main.tag : undefined,
      keepAliveMain: props.Chat?.models.main.keep_alive ? props.Chat.models.main.keep_alive : "5m",
      serverVision: props.Chat?.models.vision ? props.Chat.models.vision.server_name : undefined,
      modelVision: props.Chat?.models.vision ? props.Chat.models.vision.tag : undefined,
      keepAliveVision: props.Chat?.models.vision?.keep_alive ? props.Chat.models.vision.keep_alive : "5m",
      serverEmbedding: props.Chat?.models.embedding ? props.Chat.models.embedding.server_name : undefined,
      modelEmbedding: props.Chat?.models.embedding ? props.Chat.models.embedding.tag : undefined,
      keepAliveEmbedding: props.Chat?.models.embedding?.keep_alive ? props.Chat.models.embedding.keep_alive : "5m",
    },
    validation: {
      serverMain: FormValidation.Required,
      modelMain: FormValidation.Required,
      keepAliveMain: (value) => ValidationKeepAlive(CheckboxMainAdvanced, value),
      serverVision: CheckboxVision ? FormValidation.Required : undefined,
      modelVision: CheckboxVision ? FormValidation.Required : undefined,
      keepAliveVision: (value) => ValidationKeepAlive(CheckboxVisionAdvanced, value),
      serverEmbedding: CheckboxEmbedding ? FormValidation.Required : undefined,
      modelEmbedding: CheckboxEmbedding ? FormValidation.Required : undefined,
      keepAliveEmbedding: (value) => ValidationKeepAlive(CheckboxEmbeddingAdvanced, value),
    },
  });

  React.useEffect(() => {
    if (!CheckboxEmbedding) SetCheckboxEmbeddingAdvanced(false);
  }, [CheckboxEmbedding]);

  React.useEffect(() => {
    if (!CheckboxVision) SetCheckboxVisionAdvanced(false);
  }, [CheckboxVision]);

  const InfoServer = "Ollama Server.";
  const InfoModel = "Ollama Model.";
  const InfoEmbeddingCheckbox = "Use a different model for embedding when you want to add a large file in context.";
  const InfoVisionCheckbox = "Use a different model for vision when you multimodal cababilities is required.";

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShow(false)} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    const OllamaServer: Map<string, OllamaServer> = new Map();
    OllamaServer.set(values.serverMain, await GetOllamaServerByName(values.serverMain));
    if (values.serverEmbedding && !OllamaServer.has(values.serverEmbedding))
      OllamaServer.set(values.serverEmbedding, await GetOllamaServerByName(values.serverEmbedding));
    if (values.serverVision && !OllamaServer.has(values.serverVision))
      OllamaServer.set(values.serverVision, await GetOllamaServerByName(values.serverVision));
    let chat = props.Chat;
    if (chat && props.ChatNameIndex !== undefined) {
      chat.models.main = {
        server_name: values.serverMain,
        server: OllamaServer.get(values.serverMain) as OllamaServer,
        tag: values.modelMain,
        keep_alive: CheckboxMainAdvanced ? values.keepAliveMain : undefined,
      };
      if (values.serverEmbedding && values.modelEmbedding) {
        chat.models.embedding = {
          server_name: values.serverEmbedding,
          server: OllamaServer.get(values.serverEmbedding) as OllamaServer,
          tag: values.modelEmbedding,
          keep_alive: CheckboxEmbeddingAdvanced ? values.keepAliveEmbedding : undefined,
        };
      } else if (!CheckboxEmbedding && chat.models.embedding) {
        chat.models.embedding = undefined;
      }
      if (values.serverVision && values.modelVision) {
        chat.models.vision = {
          server_name: values.serverVision,
          server: OllamaServer.get(values.serverVision) as OllamaServer,
          tag: values.modelVision,
          keep_alive: CheckboxVisionAdvanced ? values.keepAliveVision : undefined,
        };
      } else if (!CheckboxVision && chat.models.vision) {
        chat.models.vision = undefined;
      }
      if (!(await GetSettingsCommandChatNames().catch(() => undefined))) {
        chat.name = "New Chat";
        chat.messages = [];
      }
      await SetSettingsCommandChatByIndex(props.ChatNameIndex, chat).catch(async () => {
        await AddSettingsCommandChat(chat as RaycastChat);
        await props.revalidate();
      });
    } else {
      chat = {
        name: "New Chat",
        models: {
          main: {
            server_name: values.serverMain,
            server: OllamaServer.get(values.serverMain) as OllamaServer,
            tag: values.modelMain,
            keep_alive: CheckboxMainAdvanced ? values.keepAliveMain : undefined,
          },
          embedding:
            CheckboxEmbedding && values.serverEmbedding && values.modelEmbedding
              ? {
                  server_name: values.serverEmbedding,
                  server: OllamaServer.get(values.serverEmbedding) as OllamaServer,
                  tag: values.modelEmbedding,
                  keep_alive: CheckboxEmbeddingAdvanced ? values.keepAliveEmbedding : undefined,
                }
              : undefined,
          vision:
            CheckboxVision && values.serverVision && values.modelVision
              ? {
                  server_name: values.serverEmbedding,
                  server: OllamaServer.get(values.serverEmbedding) as OllamaServer,
                  tag: values.modelEmbedding,
                  keep_alive: CheckboxVisionAdvanced ? values.keepAliveVision : undefined,
                }
              : undefined,
        },
        messages: [],
      };
      await AddSettingsCommandChat(chat);
      await props.revalidate();
    }
    props.SetChat(chat);
    props.SetChatModelsAvailable(true);
    props.SetShow(false);
  }

  return (
    <Form actions={ActionView} isLoading={IsLoadingModel}>
      {!IsLoadingModel && Model && (
        <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverMain}>
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverMain.value && (
        <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelMain}>
          {[...Model.entries()]
            .filter((v) => v[0] === itemProps.serverMain.value)[0][1]
            .sort()
            .map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverMain.value && (
        <Form.Checkbox
          id="advancedMain"
          label="Advanced Settings"
          defaultValue={CheckboxMainAdvanced}
          onChange={SetCheckboxMainAdvanced}
        />
      )}
      {CheckboxMainAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveMain} />}
      <Form.Separator />
      <Form.Checkbox
        id="embedding"
        info={InfoEmbeddingCheckbox}
        title="Embedding"
        label="Use Different Model"
        defaultValue={CheckboxEmbedding}
        onChange={SetCheckboxEmbedding}
      />
      {!IsLoadingModel && Model && CheckboxEmbedding && (
        <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverEmbedding}>
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverEmbedding.value && CheckboxEmbedding && (
        <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelEmbedding}>
          {[...Model.entries()]
            .filter((v) => v[0] === itemProps.serverEmbedding.value)[0][1]
            .sort()
            .map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverEmbedding.value && CheckboxEmbedding && (
        <Form.Checkbox
          id="advancedEmbedding"
          label="Advanced Settings"
          defaultValue={CheckboxEmbeddingAdvanced}
          onChange={SetCheckboxEmbeddingAdvanced}
        />
      )}
      {CheckboxEmbeddingAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveEmbedding} />
      )}
      <Form.Separator />
      <Form.Checkbox
        id="vision"
        info={InfoVisionCheckbox}
        title="Vision"
        label="Use Different Model"
        defaultValue={CheckboxVision}
        onChange={SetCheckboxVision}
      />
      {!IsLoadingModel && Model && CheckboxVision && (
        <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverVision}>
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverVision.value && CheckboxVision && (
        <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelVision}>
          {[...Model.entries()]
            .filter((v) => v[0] === itemProps.serverVision.value)[0][1]
            .sort()
            .map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.serverVision.value && CheckboxVision && (
        <Form.Checkbox
          id="advancedVision"
          label="Advanced Settings"
          defaultValue={CheckboxVisionAdvanced}
          onChange={SetCheckboxVisionAdvanced}
        />
      )}
      {CheckboxVisionAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveVision} />
      )}
    </Form>
  );
}
