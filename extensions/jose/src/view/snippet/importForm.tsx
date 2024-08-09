import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import {
  ClearImportModel,
  ClearImportModelTemperature,
  ConfigurationModelDefault,
  ConfigurationTypeCommunicationDefault,
} from "../../type/config";
import { SnippetHookType } from "../../type/snippet";
import { ITalkLlm, ITalkSnippet, SnippetDefaultTemperature } from "../../ai/type";

export const SnippetImportForm = (props: { use: { snippets: SnippetHookType; llms: ITalkLlm[] } }) => {
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

        const newAssistant: ITalkSnippet = {
          snippetId: uuidv4(),
          title: item.title,
          category: "new",
          emoji: item.icon,
          model: iModel,
          modelTemperature: ClearImportModelTemperature(item.creativity, SnippetDefaultTemperature),
          promptSystem: item.prompt,
          webhookUrl: undefined,
          isLocal: false,
          typeCommunication: ConfigurationTypeCommunicationDefault,
        };

        use.snippets.add({ ...newAssistant });
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
          info="Json string from https://prompts.ray.so/code"
        />
      </Form>
    </>
  );
};
