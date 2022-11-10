import fs from "fs";
import sizeOf from "image-size";
import { CreateImageRequestSizeEnum } from "openai";
import path from "path";
import { useState } from "react";

import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { ImagesGrid } from "./ImagesGrid";

const DEFAULT_NUM = 1;
const MAX_CHARS = 1000;
const MAX_IMAGE_FILE_SIZE = 4000000;

export type CreateImageValues = {
  n: string;
  size: CreateImageRequestSizeEnum;
} & ({ prompt: string; images?: never } | { prompt?: never; images: string[] });

export interface CreateImageVariationValues {
  isVariation?: boolean;
}

export function CreateImageForm(props: { draftValues?: CreateImageValues } & CreateImageVariationValues) {
  const { draftValues, isVariation } = props;
  const { enableDrafts, storeValue } = getPreferenceValues();

  const { push } = useNavigation();
  const [promptError, setPromptError] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
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

  function validateFile(images?: string[]) {
    const [image] = images || [];
    const stats = fs.statSync(image);
    const size = sizeOf(image);

    const isImage = !!image || images?.length === 1;
    const isSquare = size.height == size.width;
    const isCorrectSize = stats.size <= MAX_IMAGE_FILE_SIZE;
    const isPng = path.extname(image).toLowerCase() === ".png";

    if (!isImage || !stats.isFile() || !isSquare || !isCorrectSize || !isPng) {
      setImageError("Image must be a square PNG and under 4MB");
      return false;
    }

    if (imageError?.length) {
      setImageError(undefined);
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

  function onSubmit({ prompt, n, size, images }: CreateImageValues) {
    if (isVariation) {
      const valid = validateFile(images) && validateNumber(n);
      if (valid && images) {
        push(<ImagesGrid n={n} size={size} image={images[0]} variationCount={0} />);
      }
    } else {
      const valid = validatePrompt(prompt) && validateNumber(n);
      if (valid && prompt) {
        push(<ImagesGrid prompt={prompt} n={n} size={size} />);
      }
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
        text={
          isVariation
            ? "Given an existing image, generate a variation on it using the OpenAI DALL·E 2 image model"
            : "Given a text prompt, generate a new image using the OpenAI DALL·E 2 image model"
        }
      />
      {isVariation ? (
        <Form.FilePicker
          id="images"
          title="Image"
          info="The image to use as the basis for the variation(s). Must be a valid PNG file, less than 4MB, and square."
          allowMultipleSelection={false}
          error={imageError}
          onBlur={(event) => validateFile(event.target.value)}
          onChange={(value) => validateFile(value)}
          autoFocus={isVariation}
          defaultValue={draftValues?.images}
          storeValue={!draftValues?.images && storeValue}
        />
      ) : (
        <Form.TextArea
          id="prompt"
          title="Prompt"
          placeholder="Describe the image you want to create"
          info={`A text description of the desired image(s). The maximum length is ${MAX_CHARS} characters.`}
          error={promptError}
          onBlur={(event) => validatePrompt(event.target.value)}
          onChange={(value) => validatePrompt(value)}
          autoFocus={!isVariation}
          storeValue={!draftValues?.prompt && storeValue}
          defaultValue={draftValues?.prompt}
        />
      )}
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
