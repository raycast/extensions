import { Fragment, useState } from "react";

import { Action, ActionPanel, Form, useNavigation, getPreferenceValues } from "@raycast/api";
import { PREFERRED_MODELS } from "../hooks/useOpenAICompletionApi";
import CompletionDetails from "./CompletionDetails";

const MAX_CHARS = 1000;

export interface CompleteTextValues {
  prompt: string;
  model: string;
  temperature: string;
  max_tokens: string;
  top_p: string;
  frequency_penalty: string;
  presence_penalty: string;
}

const DEFAULT_MODEL = PREFERRED_MODELS[0].id;
const DEFAULT_TEMP = "0.7";
const DEFAULT_MAX_TOKENS = "256";
const DEFAULT_TOP_P = "1";
const DEFAULT_FREQUENCY_PENALTY = "0";
const DEFAULT_PRESENCE_PENALTY = "0";

export function CompleteTextForm(props: { draftValues?: CompleteTextValues }) {
  const { draftValues } = props;
  const { enableDrafts, storeValue } = getPreferenceValues();

  const [promptError, setPromptError] = useState<string | undefined>();
  const [showAdvanced, setShowAdvanced] = useState<boolean>();

  const { push } = useNavigation();

  const [model, setModel] = useState(PREFERRED_MODELS[0]);

  function onModelChange(newValue: string) {
    const newModel = PREFERRED_MODELS.find(({ id }) => id == newValue);
    newModel && setModel(newModel);
  }

  function validatePrompt(prompt?: string) {
    const len = prompt?.length;
    if (!len || len > MAX_CHARS) {
      setPromptError(`A prompt is required and must be under ${MAX_CHARS} characters in length`);
      return false;
    }

    if (promptError?.length) {
      setPromptError(undefined);
    }

    return true;
  }

  function onSubmit(values: CompleteTextValues) {
    const {
      prompt,
      model = DEFAULT_MODEL,
      temperature = DEFAULT_TEMP,
      max_tokens = DEFAULT_MAX_TOKENS,
      top_p = DEFAULT_TOP_P,
      frequency_penalty = DEFAULT_FREQUENCY_PENALTY,
      presence_penalty = DEFAULT_PRESENCE_PENALTY,
    } = values;

    push(
      <CompletionDetails
        prompt={prompt}
        model={model}
        temperature={toNum(temperature)}
        max_tokens={toNum(max_tokens)}
        top_p={toNum(top_p)}
        frequency_penalty={toNum(frequency_penalty)}
        presence_penalty={toNum(presence_penalty)}
      />
    );
  }

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="GPT-3 Text Completion"
        text="Given a text prompt, generate a text completion that attempts to match whatever context or pattern you gave it"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="The prompt(s) to generate completions for"
        info="Learn more about prompt design https://beta.openai.com/docs/guides/completion/prompt-design"
        error={promptError}
        onBlur={(event) => validatePrompt(event.target.value)}
        onChange={(value) => validatePrompt(value)}
        autoFocus={true}
        storeValue={!draftValues?.prompt && storeValue}
        defaultValue={draftValues?.prompt}
      />
      <Form.Checkbox id="showAdvanced" label="Show Advanced Options" onChange={setShowAdvanced} />
      {showAdvanced ? (
        <Fragment>
          <Form.Separator />
          <Form.Dropdown
            id="model"
            title="Model"
            info={model.description}
            onChange={onModelChange}
            defaultValue={DEFAULT_MODEL}
          >
            {PREFERRED_MODELS.map((model) => (
              <Form.Dropdown.Item key={model.id} title={model.id} value={model.id} />
            ))}
          </Form.Dropdown>
          <Form.TextField id="temperature" title="Temperature" defaultValue={DEFAULT_TEMP} />
          <Form.TextField id="max_tokens" title="Maximum length" defaultValue={DEFAULT_MAX_TOKENS} />
          <Form.TextField id="top_p" title="Top P" defaultValue={DEFAULT_TOP_P} />
          <Form.TextField id="frequency_penalty" title="Frequency penalty" defaultValue={DEFAULT_FREQUENCY_PENALTY} />
          <Form.TextField id="presence_penalty" title="Presence penalty" defaultValue={DEFAULT_PRESENCE_PENALTY} />
        </Fragment>
      ) : null}
    </Form>
  );
}

function toNum(str: string) {
  return parseInt(str, 10);
}
