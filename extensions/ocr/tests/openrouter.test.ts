import { describe, expect, it } from "vitest";

import { OcrDomainError, normalizeOcrError } from "../src/errors";
import { buildImageDataUrl, buildOpenRouterRequest, parseOpenRouterText, requestOpenRouterOcr } from "../src/openrouter";
import { DEFAULT_OPENROUTER_PARAMETERS, DEFAULT_OPENROUTER_PROVIDER } from "../src/types";

describe("buildImageDataUrl", () => {
  it("builds a PNG data URL from image bytes", () => {
    const imageBytes = Uint8Array.from([1, 2, 3]);

    expect(buildImageDataUrl(imageBytes)).toBe("data:image/png;base64,AQID");
  });

  it("allows overriding the MIME type", () => {
    const imageBytes = Uint8Array.from([255]);

    expect(buildImageDataUrl(imageBytes, "image/jpeg")).toBe("data:image/jpeg;base64,/w==");
  });
});

describe("buildOpenRouterRequest", () => {
  it("builds the expected chat completion payload", () => {
    const request = buildOpenRouterRequest({
      model: "google/gemini-2.0-flash-001",
      systemMessage: "Extract text only.",
      imageDataUrl: "data:image/png;base64,AQID",
      parameters: DEFAULT_OPENROUTER_PARAMETERS,
      provider: DEFAULT_OPENROUTER_PROVIDER,
    });

    expect(request).toEqual({
      model: "google/gemini-2.0-flash-001",
      max_tokens: 8192,
      temperature: 0,
      provider: {
        allow_fallbacks: true,
        data_collection: "deny",
      },
      messages: [
        {
          role: "system",
          content: "Extract text only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the readable text from this image. Return only the extracted text unless the system instructions say otherwise.",
            },
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,AQID",
              },
            },
          ],
        },
      ],
      stream: false,
    });
  });
});

describe("parseOpenRouterText", () => {
  it("extracts text from a normal response", () => {
    const response = {
      choices: [
        {
          message: {
            content: "  Hello world\n  ",
          },
        },
      ],
    };

    expect(parseOpenRouterText(response)).toBe("Hello world");
  });

  it("joins text content arrays", () => {
    const response = {
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world" },
            ],
          },
        },
      ],
    };

    expect(parseOpenRouterText(response)).toBe("Hello world");
  });

  it("returns an empty string for empty content", () => {
    const response = {
      choices: [
        {
          message: {
            content: "   ",
          },
        },
      ],
    };

    expect(parseOpenRouterText(response)).toBe("");
  });

  it("throws a provider error for malformed responses", () => {
    expect(() => parseOpenRouterText({})).toThrow(OcrDomainError);
  });
});

describe("requestOpenRouterOcr", () => {
  it("shows provider details when OpenRouter returns a generic provider error", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          message: "Provider returned error",
          metadata: {
            raw: JSON.stringify({
              error: {
                message: "This model does not support image input.",
              },
            }),
          },
        },
      }),
      {
        status: 400,
      },
    );
    const fetchImplementation = async () => response;

    await expect(
      requestOpenRouterOcr({
        setupConfig: {
          apiKey: "sk-or-test",
          model: "text-only/model",
          defaultCopyBehavior: "unformatted",
          provider: DEFAULT_OPENROUTER_PROVIDER,
          parameters: DEFAULT_OPENROUTER_PARAMETERS,
        },
        systemMessage: "Extract text only.",
        imageDataUrl: "data:image/png;base64,AQID",
        fetchImplementation: fetchImplementation as typeof fetch,
      }),
    ).rejects.toMatchObject({
      message:
        "Provider returned error: This model does not support image input. Try again, or pick a different model.",
    });
  });
});

describe("normalizeOcrError", () => {
  it("preserves domain errors", () => {
    const error = normalizeOcrError(new OcrDomainError("provider", "Provider failed.", true));

    expect(error).toEqual({
      kind: "provider",
      message: "Provider failed.",
      retryable: true,
    });
  });

  it("normalizes network-like TypeErrors", () => {
    const error = normalizeOcrError(new TypeError("fetch failed"));

    expect(error.kind).toBe("network");
    expect(error.retryable).toBe(true);
  });

  it("normalizes unknown values", () => {
    const error = normalizeOcrError("nope");

    expect(error).toEqual({
      kind: "unknown",
      message: "Something went wrong while reading the screenshot.",
      retryable: true,
    });
  });
});
