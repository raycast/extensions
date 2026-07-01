import { describe, expect, it } from "vitest";

import {
  buildUserModelsUrl,
  isImageReadingModel,
  parseOpenRouterModels,
  searchAndSortModels,
  sortModels,
} from "../src/models";

const modelsResponse = {
  data: [
    {
      id: "google/gemini-2.0-flash-001",
      name: "Gemini 2.0 Flash",
      description: "Fast multimodal model",
      created: 1_700_000_000,
      architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"],
        tokenizer: "Gemini",
      },
      pricing: {
        prompt: "0.0000001",
        completion: "0.0000004",
      },
      context_length: 1000000,
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Small multimodal model",
      created: 1_710_000_000,
      architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"],
        tokenizer: "GPT",
      },
      pricing: {
        prompt: "0",
        completion: "0",
      },
    },
    {
      id: "openai/gpt-4",
      name: "GPT-4",
      description: "Text only",
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["text"],
        tokenizer: "GPT",
      },
      pricing: {
        prompt: "0.00003",
        completion: "0.00006",
      },
    },
  ],
};

describe("buildUserModelsUrl", () => {
  it("requests image input and text output models from OpenRouter", () => {
    expect(buildUserModelsUrl()).toBe(
      "https://openrouter.ai/api/v1/models/user?input_modalities=image&output_modalities=text",
    );
  });
});

describe("parseOpenRouterModels", () => {
  it("parses model metadata used by setup", () => {
    const models = parseOpenRouterModels(modelsResponse);

    expect(models[0]).toEqual({
      id: "google/gemini-2.0-flash-001",
      name: "Gemini 2.0 Flash",
      description: "Fast multimodal model",
      createdAt: 1_700_000_000,
      architecture: {
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        tokenizer: "Gemini",
      },
      pricing: {
        prompt: "0.0000001",
        completion: "0.0000004",
      },
      contextLength: 1000000,
    });
  });
});

describe("isImageReadingModel", () => {
  it("requires image input and text output", () => {
    const models = parseOpenRouterModels(modelsResponse);

    expect(models.map(isImageReadingModel)).toEqual([true, true, false]);
  });
});

describe("searchAndSortModels", () => {
  it("filters by search text", () => {
    const models = parseOpenRouterModels(modelsResponse).filter(isImageReadingModel);

    expect(searchAndSortModels(models, { searchText: "gpt-4o-mini", sort: "name" }).map((model) => model.id)).toEqual([
      "openai/gpt-4o-mini",
    ]);
  });
});

describe("sortModels", () => {
  it("sorts recommended models by capability metadata instead of fixed model slugs", () => {
    const models = parseOpenRouterModels(modelsResponse).filter(isImageReadingModel);

    expect(sortModels(models, "recommended").map((model) => model.id)).toEqual([
      "google/gemini-2.0-flash-001",
      "openai/gpt-4o-mini",
    ]);
  });

  it("sorts by price from low to high", () => {
    const models = parseOpenRouterModels(modelsResponse).filter(isImageReadingModel);

    expect(sortModels(models, "price-low-to-high").map((model) => model.id)).toEqual([
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash-001",
    ]);
  });

  it("sorts by release date with newest first", () => {
    const models = parseOpenRouterModels(modelsResponse).filter(isImageReadingModel);

    expect(sortModels(models, "newest").map((model) => model.id)).toEqual([
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash-001",
    ]);
  });
});
