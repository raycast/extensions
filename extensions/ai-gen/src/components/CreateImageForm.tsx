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

type CreateImagePromptValues = {
  prompt: string;
  images?: never;
  masks?: never;
};

type CreateVariationPromptValues = {
  prompt?: never;
  images: string[];
  masks?: never;
};

type CreateEditPromptValues = {
  prompt: string;
  images: string[];
  masks: string[];
};

export type CreateImageValues = {
  n: string;
  size: CreateImageRequestSizeEnum;
} & (CreateImagePromptValues | CreateVariationPromptValues | CreateEditPromptValues);

export type CreateImageVariationValues =
  | {
      isVariation?: boolean;
      isEdit?: never;
    }
  | {
      isVariation?: never;
      isEdit?: boolean;
    };

export function CreateImageForm(props: { draftValues?: CreateImageValues } & CreateImageVariationValues) {
  const { draftValues, isVariation, isEdit } = props;
  const { enableDrafts, storeValue } = getPreferenceValues();

  const { push } = useNavigation();
  const [promptError, setPromptError] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
  const [maskError, setMaskError] = useState<string | undefined>();
  const [numberError, setNumberError] = useState<string | undefined>();

  let descText = "Given a text prompt, generate a new image using the OpenAI DALL·E 2 image model";
  if (isVariation) {
    descText = "Given an existing image, generate a variation on it using the OpenAI DALL·E 2 image model";
  } else if (isEdit) {
    descText =
      "Given a prompt, existing image, and a mask, generate an edited or extended image using the OpenAI DALL·E 2 image model";
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

  function validateFile(images: string[], { set, err }: { set: (msg?: string) => void; err?: string }) {
    const [image = ""] = images || [];

    let stats: fs.Stats | undefined;
    let size;
    try {
      stats = fs.statSync(image);
      size = sizeOf(image);
    } catch {
      // no-op
    }

    const isImage = !!image || images?.length === 1;
    const isSquare = size?.height == size?.width;
    const isCorrectSize = stats?.size ?? 0 <= MAX_IMAGE_FILE_SIZE;
    const isPng = path.extname(image).toLowerCase() === ".png";

    if (!isImage || !stats?.isFile() || !isSquare || !isCorrectSize || !isPng) {
      set("Image must be a square PNG and under 4MB");
      return false;
    }

    if (err?.length) {
      set(undefined);
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

  function onSubmit({ prompt, n, size, images = [], masks = [] }: CreateImageValues) {
    if (isVariation) {
      const valid = validateFile(images, { set: setImageError, err: imageError }) && validateNumber(n);
      if (valid && images) {
        push(<ImagesGrid n={n} size={size} image={images[0]} variationCount={0} />);
      }
    } else if (isEdit) {
      const valid =
        validatePrompt(prompt) &&
        validateFile(images, { set: setImageError, err: imageError }) &&
        validateFile(masks, { set: setMaskError, err: maskError }) &&
        validateNumber(n);
      if (valid && prompt && images && masks) {
        push(<ImagesGrid prompt={prompt} image={images[0]} mask={masks[0]} n={n} size={size} />);
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
      <Form.Description title="OpenAI Image Generation" text={descText} />
      {!isVariation ? (
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
      ) : null}
      {isVariation || isEdit ? (
        <Form.FilePicker
          id="images"
          title="Image"
          info="The image to use as the basis for the variation(s). Must be a valid PNG file, less than 4MB, and square."
          allowMultipleSelection={false}
          error={imageError}
          onBlur={(event) => validateFile(event.target.value || [], { set: setImageError, err: imageError })}
          onChange={(value) => validateFile(value, { set: setImageError, err: imageError })}
          autoFocus={isVariation}
          defaultValue={draftValues?.images}
          storeValue={!draftValues?.images && storeValue}
        />
      ) : null}
      {isEdit ? (
        <Form.FilePicker
          id="masks"
          title="Image Mask"
          info="An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where image should be edited. Must be a valid PNG file, less than 4MB, and have the same dimensions as image."
          allowMultipleSelection={false}
          error={maskError}
          onBlur={(event) => validateFile(event.target.value || [], { set: setMaskError, err: maskError })}
          onChange={(value) => validateFile(value, { set: setMaskError, err: maskError })}
          defaultValue={draftValues?.masks}
          storeValue={!draftValues?.masks && storeValue}
        />
      ) : null}
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
