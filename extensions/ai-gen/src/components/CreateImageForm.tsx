import { CreateImageRequestSizeEnum } from "openai";
import { useState } from "react";

import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { ImagesGrid } from "./ImagesGrid";

const DEFAULT_NUM = 1;
const MAX_CHARS = 1000;

export interface CreateImageValues {
  prompt: string;
  n: string;
  size: CreateImageRequestSizeEnum;
}

export function CreateImageForm(props: { draftValues?: CreateImageValues }) {
  const { draftValues } = props;
  const { enableDrafts, storeValue } = getPreferenceValues();

  const { push } = useNavigation();
  const [promptError, setPromptError] = useState<string | undefined>();
  const [numberError, setNumberError] = useState<string | undefined>();

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

  function validateNumber(num?: string) {
    const len = num?.length;
    const int = parseInt(num ?? "", 10);

    if (!len || len > MAX_CHARS || int.toString() !== num || int < 1 || int > 10) {
      setNumberError("Number of results must be betweeen 1 and 10");
      return false;
    }

    if (numberError?.length) {
      setNumberError(undefined);
    }

    return true;
  }

  function onSubmit({ prompt, n, size }: CreateImageValues) {
    const valid = validatePrompt(prompt) && validateNumber(n);
    if (valid) {
      push(<ImagesGrid prompt={prompt} n={n} size={size} />);
    }
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
        title="OpenAI Image Generation"
        text="Given a text prompt, generate a new image using the OpenAI DALL·E 2 image model"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe the image you want to create"
        info={`A text description of the desired image(s). The maximum length is ${MAX_CHARS} characters.`}
        error={promptError}
        onBlur={(event) => validatePrompt(event.target.value)}
        onChange={(value) => validatePrompt(value)}
        autoFocus={true}
        storeValue={!draftValues?.prompt && storeValue}
        defaultValue={draftValues?.prompt}
      />
      <Form.Separator />
      <Form.Dropdown
        id="size"
        title="Size"
        info="The size of the generated images. Larger sizes are slower to generate and cost more credits."
        defaultValue={draftValues?.size ?? CreateImageRequestSizeEnum._256x256}
        storeValue={true}
      >
        <Form.Dropdown.Item title="Small (256x256)" value={CreateImageRequestSizeEnum._256x256} />
        <Form.Dropdown.Item title="Medium (512x512)" value={CreateImageRequestSizeEnum._512x512} />
        <Form.Dropdown.Item title="Large (1024x1024)" value={CreateImageRequestSizeEnum._1024x1024} />
      </Form.Dropdown>
      <Form.TextField
        id="n"
        title="Number of images"
        placeholder="The number of images to generate"
        info="Must be between 1 and 10. More images return more slowly and cost more credits."
        defaultValue={draftValues?.n ?? DEFAULT_NUM.toString()}
        error={numberError}
        onBlur={(event) => validateNumber(event.target.value)}
        onChange={(value) => validateNumber(value)}
      />
    </Form>
  );
}
