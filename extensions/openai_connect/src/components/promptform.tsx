import { encode } from "../libs/encoder";
// import * as infoMessages from "../info-messages";
import type { ChatHook, ModelHook, PromptFormProps } from "../types";
import { Conversation } from "../types";
import { Form, ActionPanel, Action, showToast, getPreferenceValues, List, useNavigation, Toast } from "@raycast/api";
import { FC, useState } from "react";

type Values = {
  prompt: string;
  model: string;
};

const PropmtForm: FC<PromptFormProps> = ({ initQuestion, chats, models, conversation }) => {
  const [textPrompt, setTextPrompt] = useState(initQuestion || "");

  const [promptError, setPromptError] = useState<string | undefined>();
  const [numTokensPrompt, setNumTokensPrompt] = useState<number | undefined>(0);
  const { push, pop } = useNavigation();

  function handleSubmit(values: Values) {
    console.log(values);
    if (Number(numTokensPrompt) + models.maxTokenOffset > models.maxModelTokens) {
      showToast({ title: "exceed max token", message: "Please enter a shorter question", style: Toast.Style.Failure });
    } else {
      chats.ask(values.prompt, models.selectedModelName, conversation.id);
      pop();
    }
  }

  const updatePromptAndTokens = (prompt: string) => {
    setTextPrompt(prompt);
    dropPromptErrorIfNeeded();
    const encoded = encode(prompt);
    setNumTokensPrompt(encoded.length);
  };
  function dropPromptErrorIfNeeded() {
    if (promptError && promptError.length > 0) {
      setPromptError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Submit" />
        </ActionPanel>
      }
    >
      <Form.Description text="This is your AI playground" />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your prompt"
        value={textPrompt}
        error={promptError}
        onChange={(value) => {
          updatePromptAndTokens(value);
          if (Number(numTokensPrompt) + models.maxTokenOffset > models.maxModelTokens) {
            setPromptError(
              `Sum of prompt tokens and maximum tokens should be less or equal than ${models.maxModelTokens}`
            );
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPromptError("Prompt is required");
          } else if (!promptError) {
            dropPromptErrorIfNeeded();
          }
        }}
      />
      <Form.Description text={`Prompt token count: ${numTokensPrompt}`} />
      <Form.Separator />
      <Form.Description text="These are the model parameters" />
      <Form.Dropdown
        id="model"
        title="AI Model"
        info={
          'The model which will generate the completion. Some models are more sutiable for certain tasks than others. "text-davinci-003" is the most general and powerful one.'
        }
        onChange={(newValue: string) => {
          models.setSelectedModelName(newValue);
        }}
        defaultValue={models.selectedModelName}
      >
        {models.data.map((key) => {
          return <Form.Dropdown.Item key={key.name} value={key.name} title={key.name} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};
export default PropmtForm;
