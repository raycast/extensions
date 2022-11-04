import { CreateImageRequestSizeEnum } from "openai";
import { useState } from "react";

import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { ImagesGrid } from "./ImagesGrid";

interface FormValues {
  prompt: string;
  n: string;
  size: CreateImageRequestSizeEnum;
}

export function CreateImage() {
  const { push } = useNavigation();
  const [promptError, setPromptError] = useState<string | undefined>();
  const [numberError, setNumberError] = useState<string | undefined>();

  const { enableDrafts } = getPreferenceValues();

  function validatePrompt(prompt?: string) {
    const len = prompt?.length;
    if (!len || len > 1000) {
      setPromptError("A prompt is required and must be under 1000 characters in length");
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

    if (!len || len > 1000 || int.toString() !== num || int < 1 || int > 10) {
      setNumberError("Number of results must be betweeen 1 and 10");
      return false;
    }

    if (numberError?.length) {
      setNumberError(undefined);
    }

    return true;
  }

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={({ prompt, n, size }: FormValues) => {
              validatePrompt(prompt) && push(<ImagesGrid prompt={prompt} n={n} size={size} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="DALL-E AI Image Generation"
        text="Given a text prompt, generate a new image using the OpenAI DALL-E image model"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe the image you want to create"
        info="A text description of the desired image(s). The maximum length is 1000 characters."
        error={promptError}
        onBlur={(event) => validatePrompt(event.target.value)}
        onChange={(value) => validatePrompt(value)}
        autoFocus={true}
        storeValue={true}
      />
      <Form.Separator />
      <Form.Dropdown
        id="size"
        title="Size"
        info="The size of the generated images. Larger sizes are slower to generate and cost more credits."
        defaultValue={CreateImageRequestSizeEnum._256x256}
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
        defaultValue="1"
        error={numberError}
        onBlur={(event) => validateNumber(event.target.value)}
        onChange={(value) => validateNumber(value)}
      />
    </Form>
  );
}
