import { Form } from "@raycast/api";
import {
  AvailableModels,
  DefaultModel,
  Model,
  ReasoningLevels,
  getAvailableReasoningLevels,
  getReasoningLevel,
  isReasoningModel,
  supportsTemperature,
} from "../lib/OpenAI";

interface Props {
  model: Form.Dropdown.Props;
  reasoningLevel: Form.Dropdown.Props;
  temperature: Form.TextField.Props;
  maxTokens: Form.TextField.Props;
}

export default function ModelSettingsFields({ model, reasoningLevel, temperature, maxTokens }: Props) {
  const selectedModel = (model.value ?? DefaultModel) as Model;

  return (
    <>
      <Form.Dropdown
        title="Model"
        {...model}
        onChange={(value) => {
          model.onChange?.(value);
          reasoningLevel.onChange?.(getReasoningLevel(value as Model, reasoningLevel.value));
        }}
      >
        {Object.entries(AvailableModels).map(([value, name]) => (
          <Form.Dropdown.Item key={value} value={value} title={name} />
        ))}
      </Form.Dropdown>
      {isReasoningModel(selectedModel) && (
        <Form.Dropdown
          title="Reasoning Level"
          info="Controls how much thinking the model does before answering. Higher levels can help with difficult tasks, but take longer and use more tokens. Model Default keeps the model's usual setting."
          {...reasoningLevel}
          onChange={(value) => reasoningLevel.onChange?.(getReasoningLevel(selectedModel, value))}
        >
          {getAvailableReasoningLevels(selectedModel).map((level) => (
            <Form.Dropdown.Item key={level} value={level} title={ReasoningLevels[level]} />
          ))}
        </Form.Dropdown>
      )}
      {supportsTemperature(selectedModel, reasoningLevel.value) && (
        <Form.TextField
          title="Temperature"
          placeholder="Enter temperature"
          info="Controls how varied the answers are. Use a value from 0.0 to 1.0: lower values make wording more consistent; higher values make it more varied."
          {...temperature}
        />
      )}
      <Form.TextField
        title="Max Tokens"
        placeholder="Enter max tokens"
        info="The maximum number of tokens to generate. Set -1 for unlimited."
        {...maxTokens}
      />
    </>
  );
}
