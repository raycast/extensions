import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Provider, ProviderOptions } from "../types";
// import { sendMessageToChatGPT } from "../utils/gpt";

// function normalizeModel(name?: string) {
//   if (!name) return "gpt-3.5-turbo";
//   if (!name.startsWith("gpt")) return "gpt-3.5-turbo";
//   return name;
// }

class OpenaiProvider extends Provider {
  protected client: OpenAI | null;

  constructor(options: ProviderOptions) {
    super({
      ...options,
      // apiModel: normalizeModel(options?.apiModel),
    });

    if (!options.apiKey) {
      this.available = false;
      this.client = null;
    } else {
      this.client = new OpenAI({
        baseURL: options.apiHost ? `${options.apiHost.replace(/\/$/, "")}/v1` : undefined,
        httpAgent: options.httpProxy ? new HttpsProxyAgent(options.httpProxy) : undefined,
        apiKey: options.apiKey,
      });
    }
  }

  async summarize(content: string): Promise<string> {
    const { apiModel, maxTokens, summarizePrompt } = this.options;

    // return new Promise((resolve, reject) => {
    //   sendMessageToChatGPT({
    //     apiHost,
    //     agent: httpProxy ? new HttpsProxyAgent(httpProxy) : undefined,
    //     config: {
    //       apiKey: apiKey!,
    //       modelName: apiModel!,
    //     },
    //     message: {
    //       role: "user",
    //       content: content!,
    //     },
    //     contextMessages: [{
    //       role: 'system',
    //       content: summarizePrompt!
    //     }],
    //     onDone: (content) => {
    //       resolve(content ?? "");
    //     },
    //     onFail: (error) => {
    //       console.error("Error summarizing content with ChatGPT:", error);
    //       reject(error);
    //     },
    //   });
    // });

    if (!this.available) return content;

    console.log("prompt is:", summarizePrompt);
    console.log("content to be sum:", content);

    try {
      const resp = await this.client!.chat.completions.create({
        model: apiModel ?? "gpt-3.5-turbo",
        messages: [
          { role: "system", content: summarizePrompt! },
          { role: "user", content: content },
        ],
        max_tokens: maxTokens,
      });

      return resp.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      console.error("Error summarizing content:", error);
      throw error;
    }
  }

  async translate(content: string, lang = "English"): Promise<string> {
    if (!this.available) return content;
    const { apiModel, translatePrompt } = this.options;

    const prompt = typeof translatePrompt === "function" ? translatePrompt(lang) : translatePrompt || "";

    console.log("prompt is:", prompt);
    console.log("content to be translate:", content.length, content);

    try {
      const resp = await this.client!.chat.completions.create({
        model: apiModel ?? "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt! },
          { role: "user", content },
        ],
      });
      return resp.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      console.error("Error translate content:", error);
      throw error;
    }
  }
}

export { OpenaiProvider };
