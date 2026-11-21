import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fieldParams,
  fileMatchesKind,
  fileSlots,
  hiddenDefaults,
  inputFit,
  isListedModel,
  isLiveModel,
  modelFields,
  primarySlot,
  promptParameter,
  titleCase,
  validateField,
} from "../src/lib/params";
import type { WiroModel } from "../src/lib/wiro";

// Shaped like Tool/Detail for an image model with a price list.
const imageModel: WiroModel = {
  id: "1",
  title: "Example Image",
  cleanslugowner: "acme",
  cleanslugproject: "image-1",
  parameters: [
    {
      title: "Inputs",
      items: [
        {
          id: "inputImage",
          type: "combinefileinput",
          label: "Input Images",
          defaultvalue: "https://example.com/s.png",
        },
        { id: "prompt", type: "textarea", label: "Prompt", required: true, defaultvalue: "A sample prompt" },
        {
          id: "resolution",
          type: "select",
          label: "Resolution",
          required: true,
          defaultvalue: "1k",
          options: [
            { value: "1k", text: "1K" },
            { value: "2k", text: "2K" },
          ],
        },
        {
          id: "quality",
          type: "select",
          label: "quality",
          required: true,
          advanced: true,
          defaultvalue: "low",
          options: [
            { value: "low", text: "Low" },
            { value: "high", text: "High" },
          ],
        },
        {
          id: "samples",
          type: "number",
          label: "Number of Images",
          required: true,
          advanced: true,
          defaultvalue: "1",
          minvalue: "1",
          maxvalue: "10",
        },
        {
          id: "outputFormat",
          type: "select",
          label: "Output Format",
          advanced: true,
          defaultvalue: "png",
          options: [{ value: "png", text: "PNG" }],
        },
        {
          id: "negativePrompt",
          type: "text",
          label: "Negative Prompt",
          placeholder: "What to avoid",
          defaultvalue: "x",
        },
      ],
    },
  ],
  dynamicprice: [{ inputs: { quality: "low", resolution: "1k" }, price: 0.006, priceMethod: "cpr" }],
};

// Shaped like Tool/Detail for a video model whose image input is optional.
const videoModel: WiroModel = {
  id: "2",
  title: "Example Video",
  cleanslugowner: "acme",
  cleanslugproject: "video-1",
  parameters: [
    {
      items: [
        { id: "lastFrameImage", type: "combinefileinput", label: "Last Frame Image", advanced: true },
        { id: "inputImage", type: "fileinput", label: "First Frame" },
        { id: "inputImageUrl", type: "text", label: "Image URL" },
        { id: "prompt", type: "textarea", label: "prompt" },
        {
          id: "duration",
          type: "select",
          label: "duration",
          required: true,
          advanced: true,
          defaultvalue: "5",
          options: [{ value: "5" }, { value: "10" }],
        },
        { id: "watermark", type: "checkbox", label: "Watermark", advanced: true, defaultvalue: "false" },
      ],
    },
  ],
};

// A speech model takes "text", and a lip-sync model needs a face and a voice.
const speechModel: WiroModel = {
  id: "3",
  title: "Speech",
  cleanslugowner: "acme",
  cleanslugproject: "tts",
  parameters: [
    {
      items: [
        { id: "text", type: "textarea", label: "Text", required: true },
        {
          id: "voice",
          type: "select",
          label: "Voice",
          advanced: true,
          defaultvalue: "a",
          options: [{ value: "a" }, { value: "b" }],
        },
      ],
    },
  ],
};
const lipSync: WiroModel = {
  id: "4",
  title: "Lip Sync",
  cleanslugowner: "acme",
  cleanslugproject: "lips",
  parameters: [
    {
      items: [
        { id: "inputImage", type: "fileinput", label: "Face", required: true },
        { id: "inputAudio", type: "fileinput", label: "Voice", required: true },
      ],
    },
  ],
};

test("prompts are found under different names, never in a negative prompt", () => {
  assert.equal(promptParameter(imageModel)?.id, "prompt");
  assert.equal(promptParameter(speechModel)?.id, "text");
  const negativeFirst = {
    parameters: [
      {
        items: [
          { id: "negativePrompt", type: "textarea", label: "Negative Prompt" },
          { id: "inputPrompt", type: "textarea", label: "Prompt" },
        ],
      },
    ],
  };
  assert.equal(promptParameter(negativeFirst)?.id, "inputPrompt");
});

test("file inputs get a kind, and the primary slot skips last frames and masks", () => {
  assert.deepEqual(
    fileSlots(videoModel).map((slot) => [slot.param.id, slot.kind, slot.multiple]),
    [
      ["lastFrameImage", "image", true],
      ["inputImage", "image", false],
    ],
  );
  assert.equal(primarySlot(videoModel, "image")?.param.id, "inputImage");
  assert.equal(primarySlot(videoModel, "audio"), undefined);
  assert.equal(fileSlots(lipSync)[1].kind, "audio");
});

test("input fit tells a full fit from one that needs another file", () => {
  assert.equal(inputFit(videoModel, "image"), "full");
  assert.equal(inputFit(lipSync, "image"), "partial");
  assert.equal(inputFit(lipSync, "video"), "none");
  assert.equal(inputFit(speechModel, "text"), "full");
});

test("the form puts default, price-changing and key settings first and the rest in advanced", () => {
  const fields = modelFields(imageModel);
  const shown = fields.filter((field) => !field.advanced).map((field) => field.id);
  const advanced = fields.filter((field) => field.advanced).map((field) => field.id);
  assert.deepEqual(shown, ["resolution", "quality", "samples", "negativePrompt"]);
  assert.deepEqual(advanced, ["outputFormat"]);
  assert.equal(fields.find((field) => field.id === "quality")?.title, "Quality");
  assert.equal(
    fields.find((field) => field.id === "negativePrompt")?.defaultValue,
    "",
    "text samples are not prefilled",
  );
  const videoFields = modelFields(videoModel).map((field) => [field.id, field.advanced]);
  assert.deepEqual(videoFields, [
    ["duration", false],
    ["watermark", true],
  ]);
  assert.equal(modelFields(speechModel).find((field) => field.id === "voice")?.advanced, false, "voice comes first");
});

test("URL twins of file inputs are not shown as text fields", () => {
  assert.equal(
    modelFields(videoModel).some((field) => field.id === "inputImageUrl"),
    false,
  );
});

test("required settings that are not sent get their catalog defaults, samples do not", () => {
  assert.deepEqual(hiddenDefaults(imageModel, ["resolution", "prompt"]), { quality: "low", samples: 1 });
  assert.deepEqual(hiddenDefaults(videoModel, []), { duration: "5" });
});

test("form values become run parameters", () => {
  const fields = modelFields(videoModel);
  assert.deepEqual(fieldParams(fields, { duration: "10", watermark: true }), { duration: "10", watermark: "true" });
  const numberField = modelFields({
    parameters: [
      { items: [{ id: "steps", type: "number", label: "Steps", minvalue: 1, maxvalue: 50, defaultvalue: 20 }] },
    ],
  })[0];
  assert.equal(numberField.defaultValue, "20");
  assert.equal(validateField(numberField, "0"), "Minimum is 1");
  assert.equal(validateField(numberField, "2.5"), "Enter a whole number");
  assert.equal(validateField(numberField, "abc"), "Enter a number");
  assert.equal(validateField(numberField, "30"), undefined);
  assert.deepEqual(fieldParams([numberField], { steps: "" }), {});
});

test("labels are title cased", () => {
  assert.equal(titleCase("duration"), "Duration");
  assert.equal(titleCase("aspectRatio"), "Aspect Ratio");
  assert.equal(titleCase("output_format"), "Output Format");
});

test("adult-content and live models stay out of the lists", () => {
  assert.equal(isListedModel("openai/gpt-image-2"), true);
  assert.equal(isListedModel("acme/model-uncensored"), false);
  assert.equal(isListedModel("acme/model", "Model", "An abliterated chat model"), false);
  assert.equal(isListedModel("acme/nsfw-detector", "NSFW Detector"), true, "moderation tools stay");
  assert.equal(isLiveModel({ categories: ["realtime-conversation"] }), true);
  assert.equal(isLiveModel({ dynamicprice: '[{"priceMethod":"cp-realtimeturn","price":0.01}]' }), true);
  assert.equal(isLiveModel({ categories: ["speech-to-text"] }), false);
});

test("local files are matched to a kind by extension", () => {
  assert.equal(fileMatchesKind("/tmp/a.PNG", "image"), true);
  assert.equal(fileMatchesKind("/tmp/a.m4a", "audio"), true);
  assert.equal(fileMatchesKind("/tmp/a.mov", "image"), false);
  assert.equal(fileMatchesKind("/tmp/a.pdf", "file"), true);
});

test("a number field without a range or placeholder falls back to its title", () => {
  const model = {
    parameters: [
      {
        title: "Inputs",
        items: [
          { id: "seed", type: "number", label: "Seed" },
          { id: "steps", type: "number", label: "Steps", minvalue: 1, maxvalue: 50 },
        ],
      },
    ],
  } as unknown as WiroModel;
  const fields = modelFields(model);
  assert.equal(fields.find((item) => item.id === "seed")?.placeholder, "Seed");
  assert.equal(fields.find((item) => item.id === "steps")?.placeholder, "1 to 50");
});
