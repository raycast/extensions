import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { AssistantHookType } from "../../type/assistant";
import {
  ClearImportModel,
  ClearImportModelTemperature,
  ConfigurationModelDefault,
  ConfigurationTypeCommunicationDefault,
} from "../../type/config";
import { AssistantDefaultTemperature, ITalkAssistant, ITalkLlm } from "../../ai/type";

export const AssistantImportForm = (props: { use: { assistants: AssistantHookType; llms: ITalkLlm[] } }) => {
  const { use } = props;
  const { pop } = useNavigation();

  const { handleSubmit } = useForm<{ json: string }>({
    onSubmit: async (data: { json: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JSON.parse(data.json).map((item: any) => {
        let iModel = ClearImportModel(item.model);
        if (!use.llms.some((model) => model.key === iModel)) {
          iModel = ConfigurationModelDefault;
        }

        const newAssistant: ITalkAssistant = {
          assistantId: uuidv4(),
          title: item.name,
          description: "",
          emoji: item.icon,
          avatar: "",
          model: iModel,
          modelTemperature: ClearImportModelTemperature(item.creativity, AssistantDefaultTemperature),
          promptSystem: item.instructions,
          webhookUrl: undefined,
          additionalData: "",
          snippet: undefined,
          isLocal: false,
          typeCommunication: ConfigurationTypeCommunicationDefault,
        };

        use.assistants.add({ ...newAssistant });
      });
      pop();
    },
    validation: {
      json: FormValidation.Required,
    },
  });

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="json"
          title="Json string"
          placeholder='[{"name": "...", "instructions": "..."}]'
          info="Json string from https://presets.ray.so/code"
        />
      </Form>
    </>
  );
};
