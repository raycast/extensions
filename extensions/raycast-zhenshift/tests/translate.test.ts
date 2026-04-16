import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestChatCompletion } from "../src/lib/openai-compatible-client";
import { translateText } from "../src/lib/translate";

vi.mock("../src/lib/openai-compatible-client", () => ({
  requestChatCompletion: vi.fn(),
}));

describe("translateText", () => {
  beforeEach(() => {
    vi.mocked(requestChatCompletion).mockReset();
  });

  it("中文输入时应指定输出英文", async () => {
    vi.mocked(requestChatCompletion).mockResolvedValue("Hello, world");

    const result = await translateText({
      text: "你好，世界",
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      model: "test-model",
    });

    expect(result).toEqual({
      directionLabel: "中文 -> English",
      translation: "Hello, world",
    });
    expect(requestChatCompletion).toHaveBeenCalledWith({
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      model: "test-model",
      messages: [
        {
          role: "system",
          content:
            "你是一个中英翻译器。请将用户输入翻译为English。只返回译文，不要解释，不要添加引号，不要补充说明。",
        },
        {
          role: "user",
          content: "你好，世界",
        },
      ],
    });
  });

  it("英文输入时应指定输出中文", async () => {
    vi.mocked(requestChatCompletion).mockResolvedValue("你好，世界");

    const result = await translateText({
      text: "hello world",
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      model: "test-model",
    });

    expect(result).toEqual({
      directionLabel: "English -> 中文",
      translation: "你好，世界",
    });
    expect(requestChatCompletion).toHaveBeenCalledWith({
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      model: "test-model",
      messages: [
        {
          role: "system",
          content:
            "你是一个中英翻译器。请将用户输入翻译为中文。只返回译文，不要解释，不要添加引号，不要补充说明。",
        },
        {
          role: "user",
          content: "hello world",
        },
      ],
    });
  });
});
