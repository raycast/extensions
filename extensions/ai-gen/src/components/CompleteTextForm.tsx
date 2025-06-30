import GPT3Tokenizer from "gpt3-tokenizer";
import { Fragment, useState } from "react";

import { Action, ActionPanel, Form, useNavigation, getPreferenceValues } from "@raycast/api";
import { PREFERRED_MODELS } from "../hooks/useOpenAICompletionApi";
import CompletionDetails from "./CompletionDetails";

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
export interface CompleteTextErrors {
  prompt?: string;
  model?: string;
  temperature?: string;
  max_tokens?: string;
  top_p?: string;
  frequency_penalty?: string;
  presence_penalty?: string;
}

interface ValidateFieldOpt {
  id: keyof CompleteTextErrors;
  min?: number;
  max?: number;
}

const DEFAULT_MODEL = PREFERRED_MODELS[0].id;
const DEFAULT_TEMP = "0.7";
const DEFAULT_MAX_TOKENS = "256";
const DEFAULT_TOP_P = "1";
const DEFAULT_FREQUENCY_PENALTY = "0";
const DEFAULT_PRESENCE_PENALTY = "0";

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

export function CompleteTextForm(props: { draftValues?: CompleteTextValues }) {
  const { draftValues } = props;
  const { enableDrafts, storeValue } = getPreferenceValues();

  const [values, setValues] = useState<CompleteTextValues>({
    prompt: draftValues?.prompt ?? "",
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMP,
    max_tokens: DEFAULT_MAX_TOKENS,
    top_p: DEFAULT_TOP_P,
    frequency_penalty: DEFAULT_FREQUENCY_PENALTY,
    presence_penalty: DEFAULT_PRESENCE_PENALTY,
  });
  function setFormValue<T>(k: string, v: T) {
    return setValues({ ...values, ...{ [k]: v } });
  }

  const [errors, setErrors] = useState<CompleteTextErrors>();
  function setFormError(k: string, v: string | undefined) {
    return setErrors({ ...errors, ...{ [k]: v } });
  }

  const [tokenCount, setTokenCount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>();
  const [model, setModel] = useState(PREFERRED_MODELS[0]);

  const { push } = useNavigation();

  function onModelChange(newValue: string) {
    setFormValue("model", newValue);
    const newModel = PREFERRED_MODELS.find(({ id }) => id == newValue);
    newModel && setModel(newModel);
  }

  function validatePrompt(prompt?: string) {
    let len = 0;
    try {
      const { text }: { text?: string[] } = tokenizer.encode(prompt ?? "");
      len = text?.length ?? prompt?.length ?? 0;
    } catch {
      len = prompt?.length ?? 0;
    }
    setTokenCount(len);

    if (!len || len > model.max) {
      setFormError("prompt", `A prompt is required and must have fewer than ${model.max} tokens`);
      return false;
    }

    if (errors?.prompt?.length) {
      setFormError("prompt", undefined);
    }

    return true;
  }

  function validateRange(value?: string, opt?: ValidateFieldOpt) {
    const num = toNum(value);
    const { id, min = 0, max = 1 } = opt || ({} as ValidateFieldOpt);

    if (!id) {
      return false;
    }

    if (num < min || num > max) {
      setFormError?.(id, `Value must be betwee ${min} and ${max}`);
      return false;
    }

    if (errors?.[id]?.length) {
      setFormError?.(id, undefined);
    }

    return true;
  }

  function onSubmit() {
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
        text="Generate a text completion that attempts to match whatever context or pattern you gave it"
      />
      <Form.TextArea
        id="prompt"
        title={`Prompt\n${tokenCount}/${model.max} tokens`}
        placeholder="The prompt(s) to generate completions for"
        info={`Learn more about prompt design https://beta.openai.com/docs/guides/completion/prompt-design`}
        error={errors?.prompt}
        onChange={(value) => {
          setFormValue("prompt", value);
          validatePrompt(value);
        }}
        onBlur={(event) => validatePrompt(event.target.value)}
        autoFocus={true}
        storeValue={!draftValues?.prompt && storeValue}
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
            value={values?.model}
            onChange={onModelChange}
          >
            {PREFERRED_MODELS.map((model) => (
              <Form.Dropdown.Item key={model.id} title={model.id} value={model.id} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="temperature"
            title="Temperature"
            info="Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive."
            error={errors?.temperature}
            value={values?.temperature}
            onChange={(v: string) => {
              setFormValue("temperature", v);
              validateRange(v, { id: "temperature" });
            }}
            onBlur={(event) => validateRange(event.target.value, { id: "temperature" })}
          />
          <Form.TextField
            id="max_tokens"
            title="Maximum length"
            info={`The maximum number of tokens to generate. The "${model.id}" model can use up to ${model.max} tokens shared between prompt and completion. (One token is roughly 4 characters for normal English text)`}
            error={errors?.max_tokens}
            value={values?.max_tokens}
            onChange={(v: string) => {
              setFormValue("max_tokens", v);
              validateRange(v, { id: "max_tokens", max: model.max });
            }}
            onBlur={(event) => validateRange(event.target.value, { id: "max_tokens", max: model.max })}
          />
          <Form.TextField
            id="top_p"
            title="Top P"
            info="Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered."
            error={errors?.top_p}
            value={values?.top_p}
            onChange={(v: string) => {
              setFormValue("top_p", v);
              validateRange(v, { id: "top_p" });
            }}
            onBlur={(event) => validateRange(event.target.value, { id: "top_p" })}
          />
          <Form.TextField
            id="frequency_penalty"
            title="Frequency penalty"
            info="How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim."
            error={errors?.frequency_penalty}
            value={values?.frequency_penalty}
            onChange={(v: string) => {
              setFormValue("frequency_penalty", v);
              validateRange(v, { id: "frequency_penalty", max: 2 });
            }}
            onBlur={(event) => validateRange(event.target.value, { id: "frequency_penalty", max: 2 })}
          />
          <Form.TextField
            id="presence_penalty"
            title="Presence penalty"
            info="How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics."
            error={errors?.presence_penalty}
            value={values?.presence_penalty}
            onChange={(v: string) => {
              setFormValue("presence_penalty", v);
              validateRange(v, { id: "presence_penalty", max: 2 });
            }}
            onBlur={(event) => validateRange(event.target.value, { id: "presence_penalty", max: 2 })}
          />
        </Fragment>
      ) : null}
    </Form>
  );
}

function toNum(str?: string) {
  return parseFloat(str ?? "0");
}
