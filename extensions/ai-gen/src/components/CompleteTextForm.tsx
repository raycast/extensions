import { Fragment, useState } from "react";

import { Action, ActionPanel, Form, useNavigation, getPreferenceValues } from "@raycast/api";
import { PREFERRED_MODELS } from "../hooks/useOpenAICompletionApi";
import CompletionDetails from "./CompletionDetails";

const MAX_CHARS = 1000;

export interface CompleteTextValues {
  prompt: string;
  showAdvanced?: boolean;
  model?: string;
  temperature?: string;
  max_tokens?: string;
  top_p?: string;
  frequency_penalty?: string;
  presence_penalty?: string;
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
  const [model, setModel] = useState(PREFERRED_MODELS[0]);

  const [temperatureError, setTemperatureError] = useState<string | undefined>();
  const [maxTokensError, setMaxTokensError] = useState<string | undefined>();
  const [topPError, setTopPError] = useState<string | undefined>();
  const [frequencyError, setFequencyError] = useState<string | undefined>();
  const [presenceError, setPresenceError] = useState<string | undefined>();

  const { push } = useNavigation();

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

  function validateTemperature(value?: string, opt: { min?: number; max?: number } = {}) {
    const valid = validateRange(value, opt);

    if (!valid) {
      setTemperatureError(`Value must be betwee ${opt.min} and ${opt.max}`);
      return false;
    }

    if (temperatureError?.length) {
      setTemperatureError(undefined);
    }
  }

  function validateMaxTokens(value?: string, opt: { min?: number; max?: number } = {}) {
    const valid = validateRange(value, opt);

    if (!valid) {
      setMaxTokensError(`Value must be betwee ${opt.min} and ${opt.max}`);
      return false;
    }

    if (maxTokensError?.length) {
      setMaxTokensError(undefined);
    }
  }

  function validateTopP(value?: string, opt: { min?: number; max?: number } = {}) {
    const valid = validateRange(value, opt);

    if (!valid) {
      setTopPError(`Value must be betwee ${opt.min} and ${opt.max}`);
      return false;
    }

    if (topPError?.length) {
      setTopPError(undefined);
    }
  }

  function validateFrequency(value?: string, opt: { min?: number; max?: number } = {}) {
    const valid = validateRange(value, opt);

    if (!valid) {
      setFequencyError(`Value must be betwee ${opt.min} and ${opt.max}`);
      return false;
    }

    if (frequencyError?.length) {
      setFequencyError(undefined);
    }
  }

  function validatePresence(value?: string, opt: { min?: number; max?: number } = {}) {
    const valid = validateRange(value, opt);

    if (!valid) {
      setPresenceError(`Value must be betwee ${opt.min} and ${opt.max}`);
      return false;
    }

    if (presenceError?.length) {
      setPresenceError(undefined);
    }
  }

  function onSubmit(values: CompleteTextValues) {
    const {
      prompt,
      showAdvanced,
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
        showAdvanced={showAdvanced ?? false}
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
      <Form.Checkbox
        id="showAdvanced"
        label="Show Advanced Options"
        onChange={setShowAdvanced}
        defaultValue={draftValues?.showAdvanced}
      />
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
          <Form.TextField
            id="temperature"
            title="Temperature"
            info="Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive."
            defaultValue={DEFAULT_TEMP}
            error={temperatureError}
            onBlur={(event) => validateTemperature(event.target.value)}
          />
          <Form.TextField
            id="max_tokens"
            title="Maximum length"
            info={`The maximum number of tokens to generate. The "${model.id}" model can use up to ${model.max} tokens shared between prompt and completion. (One token is roughly 4 characters for normal English text)`}
            defaultValue={DEFAULT_MAX_TOKENS}
            error={maxTokensError}
            onBlur={(event) => validateMaxTokens(event.target.value, { min: 0, max: model.max })}
          />
          <Form.TextField
            id="top_p"
            title="Top P"
            info="Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered."
            defaultValue={DEFAULT_TOP_P}
            error={topPError}
            onBlur={(event) => validateTopP(event.target.value)}
          />
          <Form.TextField
            id="frequency_penalty"
            title="Frequency penalty"
            info="How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim."
            defaultValue={DEFAULT_FREQUENCY_PENALTY}
            error={frequencyError}
            onBlur={(event) => validateFrequency(event.target.value, { min: 0, max: 2 })}
          />
          <Form.TextField
            id="presence_penalty"
            title="Presence penalty"
            info="How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics."
            defaultValue={DEFAULT_PRESENCE_PENALTY}
            error={presenceError}
            onBlur={(event) => validatePresence(event.target.value, { min: 0, max: 2 })}
          />
        </Fragment>
      ) : null}
    </Form>
  );
}

function toNum(str?: string) {
  return parseFloat(str ?? "0");
}

function validateRange(value?: string, opt: { min?: number; max?: number } = {}) {
  const num = toNum(value);
  const { min = 0, max = 1 } = opt;

  if (num < min || num > max) {
    return false;
  }

  return true;
}
