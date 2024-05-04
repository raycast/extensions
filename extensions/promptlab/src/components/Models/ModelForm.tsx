import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LocalStorage,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { Model, ModelManager } from "../../lib/models/types";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { randomUUID } from "crypto";
import { ADVANCED_SETTINGS_FILENAME } from "../../lib/common/constants";
import path from "path";
import fs from "fs";
import { updateModel } from "../../lib/models";

interface ModelFormValues {
  name: string;
  description: string;
  endpoint: string;
  authType: string;
  apiKey: string;
  inputSchema: string;
  outputKeyPath: string;
  outputTiming: string;
  lengthLimit: string;
  favorited: boolean;
  id: string;
  icon: string;
  iconColor: string;
  notes: string;
  isDefault: boolean;
  temperature: string;
}

export default function ModelForm(props: { models: ModelManager; currentModel?: Model; duplicate?: boolean }) {
  const { models, currentModel, duplicate } = props;
  const { pop } = useNavigation();
  const [uuid, setUUID] = useState<string>("");

  const getDefaultValues = () => {
    try {
      const advancedSettingsValues = JSON.parse(
        fs.readFileSync(path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME), "utf-8"),
      );
      if ("modelDefaults" in advancedSettingsValues) {
        return advancedSettingsValues.modelDefaults;
      }
    } catch (error) {
      console.error(error);
    }

    return models.dummyModel();
  };

  useEffect(() => {
    const id = randomUUID();
    setUUID(id);
    if (currentModel && !currentModel.id) {
      Promise.resolve(updateModel(currentModel, { ...currentModel, id: id })).then(() => models.revalidate());
    }
  }, []);

  const { handleSubmit, itemProps, values } = useForm<ModelFormValues>({
    async onSubmit(values) {
      await LocalStorage.setItem(`--model-${values.name}`, JSON.stringify(values));
      if (currentModel && currentModel.name != values.name) {
        await LocalStorage.removeItem(`--model-${currentModel.name}`);
      }

      models.revalidate();

      if (currentModel && !duplicate) {
        await showToast({ title: "Models Saved" });
      } else {
        await showToast({ title: "Added Model" });
      }

      pop();
    },
    initialValues: currentModel || getDefaultValues(),
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Model Name" {...itemProps.name} info="A recognizable name for the model." />

      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {Object.keys(Icon).map((iconName, index) => (
          <Form.Dropdown.Item
            title={iconName}
            value={Object.values(Icon)[index]}
            key={iconName}
            icon={Object.values(Icon)[index]}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Icon Color" {...itemProps.iconColor}>
        <Form.Dropdown.Item
          title={environment.appearance == "dark" ? "White" : "Black"}
          value={Color.PrimaryText}
          icon={{ source: Icon.CircleFilled, tintColor: Color.PrimaryText }}
        />
        <Form.Dropdown.Item title="Red" value={Color.Red} icon={{ source: Icon.CircleFilled, tintColor: Color.Red }} />
        <Form.Dropdown.Item
          title="Orange"
          value={Color.Orange}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          title="Yellow"
          value={Color.Yellow}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          title="Green"
          value={Color.Green}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          title="Blue"
          value={Color.Blue}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          title="Purple"
          value={Color.Purple}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
        />
        <Form.Dropdown.Item
          title="Magenta"
          value={Color.Magenta}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
        />
      </Form.Dropdown>

      <Form.Checkbox
        label="Default"
        {...itemProps.isDefault}
        info="Whether to use this model as the default for all commands that don't specify a particular model"
      />

      <Form.Checkbox
        label="Favorited"
        {...itemProps.favorited}
        info="Whether to add this model to the favorited models list"
      />

      <Form.Separator />

      <Form.Description title="Model Details" text="The details of the model" />

      <Form.TextField
        title="Endpoint"
        {...itemProps.endpoint}
        info="The API endpoint of the model used to generate PromptLab command output."
      />

      <Form.Dropdown
        title="Auth Type"
        {...itemProps.authType}
        info="The authorization type for the model endpoint, e.g. API Key or Bearer."
      >
        <Form.Dropdown.Item title="API Key" value="apiKey" icon={{ source: Icon.Key }} />
        <Form.Dropdown.Item title="Bearer Token" value="bearerToken" icon={{ source: Icon.Lock }} />
        <Form.Dropdown.Item title="X-API-Key" value="x-api-key" icon={{ source: Icon.Key }} />
      </Form.Dropdown>

      <Form.PasswordField title={`${values.authType}`} {...itemProps.apiKey} info="The API key for the model source." />

      <Form.TextField
        title="Input Schema"
        {...itemProps.inputSchema}
        info="The JSON schema of the endpoint used to generate PromptLab command output. Use {prompt} to represent PromptLab's entire query to the model input, or {basePrompt} and {input} to represent the component parts."
      />

      <Form.TextField
        title="Output Key Path"
        {...itemProps.outputKeyPath}
        info="The key path to the text output in the JSON response from the model endpoint. For example, choices[0].message.content, for the OpenAI API."
      />

      <Form.TextField
        title="Creativity"
        {...itemProps.temperature}
        info="A measure of how much randomness and creativity the model will use in its outputs. Also called temperature."
      />

      <Form.Dropdown
        title="Output Timing"
        {...itemProps.outputTiming}
        info="Whether output from the model endpoint should be processed synchronously or asynchronously. Often, this is also an option on the model API."
      >
        <Form.Dropdown.Item title="Synchronous" value="sync" icon={{ source: Icon.Clock }} />
        <Form.Dropdown.Item title="Asynchronous" value="async" icon={{ source: Icon.QuestionMarkCircle }} />
      </Form.Dropdown>

      <Form.TextField
        title="Length Limit"
        {...itemProps.lengthLimit}
        info="The maximum length of the prompt that will be sent to the model endpoint, beyond which it will be truncated. Larger values will support more content, but may result in token count errors. Adjust this value according to the model's token limit (but leave some space, e.g. 1000 characters, for additional input and placeholders)."
      />

      <Form.Separator />

      <Form.Description title="Metadata" text="Additional information that may come in useful" />

      <Form.TextArea
        title="Description"
        {...itemProps.description}
        info="A brief description for the model, e.g. what you are mainly using it for"
      />

      <Form.TextField title="Notes" {...itemProps.notes} info="Personal notes regarding this model" />

      <Form.TextField
        title="ID"
        {...itemProps.id}
        value={currentModel && currentModel.id ? currentModel.id : uuid}
        info="The unique ID of this model"
      />
    </Form>
  );
}
