import { compilePrompt, formatOutputForMode, mapHttpError, OutputMode } from "../src/lib/llm";

type MockResponseInput = {
  ok: boolean;
  status: number;
  statusText?: string;
  textBody?: string;
  jsonBody?: unknown;
};

function mockResponse(input: MockResponseInput): Response {
  return {
    ok: input.ok,
    status: input.status,
    statusText: input.statusText || "",
    text: async () => input.textBody || "",
    json: async () => input.jsonBody,
  } as Response;
}

describe("llm", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  test("compilePrompt parses markdown sections from OpenAI-compatible response", async () => {
    const content = "## English Translation\nTranslated text\n\n## Optimized Prompt\nOptimized output";
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        jsonBody: { choices: [{ message: { content } }] },
      })
    );

    const result = await compilePrompt("hola", {
      provider: "openai",
      apiKey: "k",
      baseUrl: "https://api.openai.com",
      model: "gpt-4o",
    });

    expect(result.translation).toBe("Translated text");
    expect(result.optimizedPrompt).toBe("Optimized output");
    expect(result.markdown).toContain("## English Translation");
    expect(result.markdown).toContain("## Optimized Prompt");
  });

  test("compilePrompt falls back when headings are missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        jsonBody: { choices: [{ message: { content: "Raw answer only" } }] },
      })
    );

    const result = await compilePrompt("text", {
      provider: "deepseek",
      apiKey: "k",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
    });

    expect(result.translation).toBe("Raw answer only");
    expect(result.optimizedPrompt).toBe("Raw answer only");
  });

  test("compilePrompt maps 429 to quota/rate limit guidance", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        ok: false,
        status: 429,
        textBody: "insufficient_quota",
      })
    );

    await expect(
      compilePrompt("text", {
        provider: "openai",
        apiKey: "k",
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
      })
    ).rejects.toThrow("rate limit or quota reached");
  });

  test("compilePrompt maps AbortError to timeout guidance", async () => {
    const timeoutError = Object.assign(new Error("aborted"), { name: "AbortError" });
    (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

    await expect(
      compilePrompt("text", {
        provider: "gemini",
        apiKey: "k",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        model: "gemini-2.5-flash",
      })
    ).rejects.toThrow("timed out");
  });

  test("formatOutputForMode returns selected section", () => {
    const result = {
      markdown: "m",
      translation: "t",
      optimizedPrompt: "p",
    };

    const expectations: Record<OutputMode, string> = {
      both: "m",
      translation: "t",
      prompt: "p",
    };

    for (const [mode, expected] of Object.entries(expectations)) {
      expect(formatOutputForMode(result, mode as OutputMode)).toBe(expected);
    }
  });

  test("mapHttpError handles auth failures with provider context", () => {
    const error = mapHttpError("anthropic", 401, "Unauthorized");
    expect(error.message).toContain("Invalid API key");
    expect(error.message).toContain("Anthropic");
  });
});
