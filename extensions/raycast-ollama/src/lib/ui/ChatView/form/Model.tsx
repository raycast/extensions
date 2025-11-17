import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage, usePromise } from "@raycast/utils";
import * as React from "react";
import { McpServerConfig } from "../../../mcp/types";
import { OllamaApiModelCapability } from "../../../ollama/enum";
import { OllamaServer } from "../../../ollama/types";
import {
  AddSettingsCommandChat,
  GetOllamaServerByName,
  GetSettingsCommandChatNames,
  SetSettingsCommandChatByIndex,
} from "../../../settings/settings";
import { RaycastChat } from "../../../settings/types";
import { GetModels } from "../../function";
import { InfoKeepAlive } from "../../info";
import { UiModelDetails } from "../../types";
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
  serverTools: string;
  modelTools: string;
  keepAliveTools: string;
  serverEmbedding: string;
  modelEmbedding: string;
  keepAliveEmbedding: string;
  mcp_server: string[];
}

export function FormModel(props: props): JSX.Element {
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: (data) => {
      if (props.Chat === undefined) return;

      if (data.has(props.Chat.models.main.server_name)) {
        setValue("serverMain", props.Chat.models.main.server_name);
        const models = (data.get(props.Chat.models.main.server_name) as UiModelDetails[]).filter(
          (model) =>
            model.capabilities && model.capabilities.findIndex((c) => c === OllamaApiModelCapability.COMPLETION) !== -1
        );
        if (models.filter((model) => model.name === props.Chat?.models.main.tag).length > 0)
          setValue("modelMain", props.Chat.models.main.tag);
      }

      if (props.Chat.models.vision && data.has(props.Chat.models.vision.server_name)) {
        setValue("serverVision", props.Chat.models.vision.server_name);
        const models = (data.get(props.Chat.models.vision.server_name) as UiModelDetails[]).filter(
          (model) =>
            model.capabilities && model.capabilities.findIndex((c) => c === OllamaApiModelCapability.VISION) !== -1
        );
        if (models.filter((model) => model.name === props.Chat?.models.vision?.tag).length > 0)
          setValue("modelVision", props.Chat.models.vision.tag);
      }

      if (props.Chat.models.tools && data.has(props.Chat.models.tools.server_name)) {
        setValue("serverTools", props.Chat.models.tools.server_name);
        const models = (data.get(props.Chat.models.tools.server_name) as UiModelDetails[]).filter(
          (model) =>
            model.capabilities && model.capabilities.findIndex((c) => c === OllamaApiModelCapability.TOOLS) !== -1
        );
        if (models.filter((model) => model.name === props.Chat?.models.tools?.tag).length > 0)
          setValue("modelTools", props.Chat.models.tools.tag);
      }

      if (props.Chat.models.embedding && data.has(props.Chat.models.embedding.server_name)) {
        setValue("serverEmbedding", props.Chat.models.embedding.server_name);
        const models = (data.get(props.Chat.models.embedding.server_name) as UiModelDetails[]).filter(
          (model) =>
            model.capabilities && model.capabilities.findIndex((c) => c === OllamaApiModelCapability.EMBEDDING) !== -1
        );
        if (models.filter((model) => model.name === props.Chat?.models.embedding?.tag).length > 0)
          setValue("modelEmbedding", props.Chat.models.embedding.tag);
      }
    },
  });
  const { value: McpServer, isLoading: isLoadingMcpServer } = useLocalStorage<McpServerConfig>("mcp_server_config", {
    mcpServers: {},
  });
  const [CheckboxMainAdvanced, SetCheckboxMainAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat && props.Chat.models.main.keep_alive ? true : false);
  const [CheckboxVision, SetCheckboxVision]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(
    props.Chat?.models.vision ? true : false
  );
  const [CheckboxVisionAdvanced, SetCheckboxVisionAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat?.models.vision && props.Chat.models.vision.keep_alive ? true : false);
  const [CheckboxTools, SetCheckboxTools]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(
    props.Chat?.models.tools ? true : false
  );
  const [CheckboxToolsAdvanced, SetCheckboxToolsAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat?.models.tools && props.Chat.models.tools.keep_alive ? true : false);
  const [CheckboxEmbedding, SetCheckboxEmbedding]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.Chat?.models.embedding ? true : false);
  const [CheckboxEmbeddingAdvanced, SetCheckboxEmbeddingAdvanced]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = React.useState(props.Chat?.models.embedding && props.Chat.models.embedding.keep_alive ? true : false);
  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      keepAliveMain: props.Chat?.models.main.keep_alive ? props.Chat.models.main.keep_alive : "5m",
      keepAliveVision: props.Chat?.models.vision?.keep_alive ? props.Chat.models.vision.keep_alive : "5m",
      keepAliveTools: props.Chat?.models.tools?.keep_alive ? props.Chat.models.tools.keep_alive : "5m",
      keepAliveEmbedding: props.Chat?.models.embedding?.keep_alive ? props.Chat.models.embedding.keep_alive : "5m",
    },
    validation: {
      serverMain: FormValidation.Required,
      modelMain: FormValidation.Required,
      keepAliveMain: (value) => ValidationKeepAlive(CheckboxMainAdvanced, value),
      serverVision: CheckboxVision ? FormValidation.Required : undefined,
      modelVision: CheckboxVision ? FormValidation.Required : undefined,
      keepAliveVision: (value) => ValidationKeepAlive(CheckboxVisionAdvanced, value),
      serverTools: CheckboxTools ? FormValidation.Required : undefined,
      modelTools: CheckboxTools ? FormValidation.Required : undefined,
      keepAliveTools: (value) => ValidationKeepAlive(CheckboxToolsAdvanced, value),
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

  React.useEffect(() => {
    if (props.Chat?.mcp_server && !isLoadingMcpServer && McpServer)
      setValue(
        "mcp_server",
        props.Chat.mcp_server.filter(
          (selectedMcp) =>
            Object.keys(McpServer.mcpServers).findIndex((availableMcp) => selectedMcp === availableMcp) !== -1
        )
      );
  }, [McpServer, isLoadingMcpServer]);

  const InfoServer = "Ollama Server.";
  const InfoModel = "Ollama Model.";
  const InfoVisionCheckbox = "Use a different model for vision when you multimodal capabilities is required.";
  const InfoToolsCheckbox = "Use a different model for tools when tool calling is required.";
  const InfoEmbeddingCheckbox = "Use a different model for embedding when you want to add a large file in context.";
  const InfoMcpServer =
    'Server can be configured with "Manage Mcp Server" Command. A model with tools capabilities is required.';

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShow(false)} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    const OllamaServer: Map<string, OllamaServer> = new Map();
    OllamaServer.set(values.serverMain, await GetOllamaServerByName(values.serverMain));
    if (values.serverVision && !OllamaServer.has(values.serverVision))
      OllamaServer.set(values.serverVision, await GetOllamaServerByName(values.serverVision));
    if (values.serverTools && !OllamaServer.has(values.serverTools))
      OllamaServer.set(values.serverTools, await GetOllamaServerByName(values.serverTools));
    if (values.serverEmbedding && !OllamaServer.has(values.serverEmbedding))
      OllamaServer.set(values.serverEmbedding, await GetOllamaServerByName(values.serverEmbedding));
    let chat = props.Chat;
    if (chat && props.ChatNameIndex !== undefined) {
      chat.models.main = {
        server_name: values.serverMain,
        server: OllamaServer.get(values.serverMain) as OllamaServer,
        tag: values.modelMain,
        keep_alive: CheckboxMainAdvanced ? values.keepAliveMain : undefined,
      };
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
      if (values.serverTools && values.modelTools) {
        chat.models.tools = {
          server_name: values.serverTools,
          server: OllamaServer.get(values.serverTools) as OllamaServer,
          tag: values.modelTools,
          keep_alive: CheckboxToolsAdvanced ? values.keepAliveTools : undefined,
        };
      } else if (!CheckboxTools && chat.models.tools) {
        chat.models.tools = undefined;
      }
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
      if (values.mcp_server.length > 0) {
        chat.mcp_server = values.mcp_server;
      } else {
        chat.mcp_server = undefined;
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
          vision:
            CheckboxVision && values.serverVision && values.modelVision
              ? {
                  server_name: values.serverVision,
                  server: OllamaServer.get(values.serverVision) as OllamaServer,
                  tag: values.modelVision,
                  keep_alive: CheckboxVisionAdvanced ? values.keepAliveVision : undefined,
                }
              : undefined,
          tools:
            CheckboxTools && values.serverTools && values.modelTools
              ? {
                  server_name: values.serverTools,
                  server: OllamaServer.get(values.serverTools) as OllamaServer,
                  tag: values.modelTools,
                  keep_alive: CheckboxToolsAdvanced ? values.keepAliveTools : undefined,
                }
              : undefined,
          embedding:
            CheckboxEmbedding && values.serverEmbedding && values.modelEmbedding
              ? {
                  server_name: values.serverEmbedding,
                  server: OllamaServer.get(values.serverEmbedding) as OllamaServer,
                  tag: values.modelEmbedding,
                  keep_alive: CheckboxEmbeddingAdvanced ? values.keepAliveEmbedding : undefined,
                }
              : undefined,
        },
        messages: [],
        mcp_server: values.mcp_server.length > 0 ? values.mcp_server : undefined,
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
      {!IsLoadingModel && Model && itemProps && (
        <React.Fragment>
          <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverMain}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelMain}>
            {itemProps.serverMain.value &&
              Model.get(itemProps.serverMain.value)!
                .filter(
                  (t) =>
                    t.capabilities && t.capabilities.findIndex((c) => c === OllamaApiModelCapability.COMPLETION) !== -1
                )
                .sort()
                .map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          <Form.Checkbox
            id="advancedMain"
            label="Advanced Settings"
            defaultValue={CheckboxMainAdvanced}
            onChange={SetCheckboxMainAdvanced}
          />
        </React.Fragment>
      )}
      {CheckboxMainAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveMain} />}
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Separator />
          <Form.Checkbox
            id="vision"
            info={InfoVisionCheckbox}
            title="Vision"
            label="Use Different Model"
            defaultValue={CheckboxVision}
            onChange={SetCheckboxVision}
          />
        </React.Fragment>
      )}
      {!IsLoadingModel && Model && itemProps && CheckboxVision && (
        <React.Fragment>
          <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverVision}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelVision}>
            {itemProps.serverVision.value &&
              Model.get(itemProps.serverVision.value)!
                .filter(
                  (t) => t.capabilities && t.capabilities.findIndex((c) => c === OllamaApiModelCapability.VISION) !== -1
                )
                .sort()
                .map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          <Form.Checkbox
            id="advancedVision"
            label="Advanced Settings"
            defaultValue={CheckboxVisionAdvanced}
            onChange={SetCheckboxVisionAdvanced}
          />
        </React.Fragment>
      )}
      {CheckboxVisionAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveVision} />
      )}
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Separator />
          <Form.Checkbox
            id="tools"
            info={InfoToolsCheckbox}
            title="Tools"
            label="Use Different Model"
            defaultValue={CheckboxTools}
            onChange={SetCheckboxTools}
          />
        </React.Fragment>
      )}
      {!IsLoadingModel && Model && itemProps && CheckboxTools && (
        <React.Fragment>
          <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverTools}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelTools}>
            {itemProps.serverTools.value &&
              Model.get(itemProps.serverTools.value)!
                .filter(
                  (t) => t.capabilities && t.capabilities.findIndex((c) => c === OllamaApiModelCapability.TOOLS) !== -1
                )
                .sort()
                .map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          <Form.Checkbox
            id="advancedTools"
            label="Advanced Settings"
            defaultValue={CheckboxToolsAdvanced}
            onChange={SetCheckboxToolsAdvanced}
          />
        </React.Fragment>
      )}
      {CheckboxToolsAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveTools} />
      )}
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Separator />
          <Form.Checkbox
            id="embedding"
            info={InfoEmbeddingCheckbox}
            title="Embedding"
            label="Use Different Model"
            defaultValue={CheckboxEmbedding}
            onChange={SetCheckboxEmbedding}
          />
        </React.Fragment>
      )}
      {!IsLoadingModel && Model && itemProps && CheckboxEmbedding && (
        <React.Fragment>
          <Form.Dropdown title="Server" info={InfoServer} {...itemProps.serverEmbedding}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Model" info={InfoModel} {...itemProps.modelEmbedding}>
            {itemProps.serverEmbedding.value &&
              Model.get(itemProps.serverEmbedding.value)!
                .filter(
                  (t) =>
                    t.capabilities && t.capabilities.findIndex((c) => c === OllamaApiModelCapability.EMBEDDING) !== -1
                )
                .sort()
                .map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          <Form.Checkbox
            id="advancedEmbedding"
            label="Advanced Settings"
            defaultValue={CheckboxEmbeddingAdvanced}
            onChange={SetCheckboxEmbeddingAdvanced}
          />
        </React.Fragment>
      )}
      {CheckboxEmbeddingAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keepAliveEmbedding} />
      )}
      {McpServer && !isLoadingMcpServer && (
        <React.Fragment>
          <Form.Separator />
          <Form.TagPicker title="Mcp Server" info={InfoMcpServer} {...itemProps.mcp_server}>
            {Object.keys(McpServer.mcpServers).map((name) => {
              return <Form.TagPicker.Item value={name} title={name} icon={Icon.WrenchScrewdriver} />;
            })}
          </Form.TagPicker>
        </React.Fragment>
      )}
    </Form>
  );
}
