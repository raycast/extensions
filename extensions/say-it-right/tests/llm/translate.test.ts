import { describe, it, expect, vi } from "vitest";
import {
  buildTranslationPrompt,
  resolveTranslationTarget,
  translateText,
} from "../../src/llm/translate";
import type { ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = {
  baseURL: "https://api.test/v1",
  apiKey: "sk",
  model: "m",
};

describe("translation prompt", () => {
  it("builds a meaning-first Chinese translation prompt", () => {
    const prompt = buildTranslationPrompt({
      text: "Could you turn it off?",
      targetLanguage: "zh-Hans",
      targetLanguageTitle: "Chinese Simplified",
      style: "balanced",
      promptProfile: "general",
    });

    expect(prompt.system).toContain("meaning-first translator");
    expect(prompt.system).toContain("not as English syntax rewritten");
    expect(prompt.system).toContain("Role:");
    expect(prompt.system).toContain("Output use:");
    expect(prompt.system).toContain("SkillOpt-style validation gate:");
    expect(prompt.system).toContain("Return only the final output");
    expect(prompt.user).toContain("Target language: Chinese Simplified.");
    expect(prompt.user).toContain("Could you turn it off?");
  });

  it("builds an intent-expression prompt that does not mirror Chinese wording", () => {
    const prompt = buildTranslationPrompt({
      text: "我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。",
      targetLanguage: "en",
      targetLanguageTitle: "English",
      style: "polished",
      promptProfile: "general",
      mode: "express-intent",
      expressionTone: "formal",
    });

    expect(prompt.system).toContain("cross-language expression coach");
    expect(prompt.system).toContain("not as a sentence that must be mirrored");
    expect(prompt.system).toContain("native speaker");
    expect(prompt.system).toContain("For English, prefer concise");
    expect(prompt.system).toContain("Good English intent-expression examples");
    expect(prompt.system).toContain("treat that framing as task instruction");
    expect(prompt.system).toContain("address that person directly");
    expect(prompt.system).toContain("Preserve practical constraints");
    expect(prompt.system).toContain("Keep dates and deadlines precise");
    expect(prompt.system).toContain("Do not add unsupported concessions");
    expect(prompt.system).toContain("Do not preserve Chinese word order");
    expect(prompt.system).toContain(
      "The result may be pasted into a message or read aloud by a text-to-speech model.",
    );
    expect(prompt.system).toContain(
      "avoid document-style symbols, and keep sentences short enough",
    );
    expect(prompt.system).toContain("Remove stiff, generic AI-sounding polish");
    expect(prompt.system).toContain("Expression tone:");
    expect(prompt.system).toContain("more formal and professional");
    expect(prompt.system).toContain("SkillOpt-style validation gate:");
    expect(prompt.system).toContain("Meaning gate:");
    expect(prompt.system).toContain('{"expression": string, "why": string}');
    expect(prompt.user).toContain(
      "Task: Express the source intention naturally",
    );
    expect(prompt.user).toContain("Expression tone:");
    expect(prompt.user).toContain("Do not mirror its wording");
    expect(prompt.user).toContain("Intention:");
    expect(prompt.user).not.toContain("Text:");
  });

  it("resolves target language titles", () => {
    expect(resolveTranslationTarget("auto", "你好")).toEqual({
      language: "en",
      title: "English",
    });
  });
});

describe("translateText", () => {
  it("calls the model without JSON mode and strips accidental fences", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "```text\n请把它关掉好吗？\n```" } }],
      }),
      text: async () => "",
    })) as unknown as typeof fetch;

    const out = await translateText(
      "Could you turn it off?",
      cfg,
      "zh-Hans",
      fetchImpl,
    );

    expect(out.translation).toBe("请把它关掉好吗？");
    const body = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0][1].body as string;
    expect(body).not.toContain("response_format");
  });

  it("can express Chinese intent through the options API", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                expression:
                  "Could you send me the file by this afternoon when you get a chance?",
                why: "- 用 could you 保持礼貌，但直接保留今天下午这个期限。\n- when you get a chance 让语气柔和，不把催促写得过重。",
              }),
            },
          },
        ],
      }),
      text: async () => "",
    })) as unknown as typeof fetch;

    const out = await translateText(
      "我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。",
      cfg,
      { mode: "express-intent", fetchImpl },
    );

    expect(out.targetLanguage).toBe("en");
    expect(out.translation).toContain("Could you send me the file");
    expect(out.coaching).toContain("could you");
    const body = JSON.parse(
      (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } })
        .mock.calls[0][1].body as string,
    ) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages[0].content).toContain(
      "cross-language expression coach",
    );
    expect(body.messages[0].content).toContain(
      "SkillOpt-style validation gate",
    );
    expect(body.messages[1].content).toContain("Intention:");
  });
});
