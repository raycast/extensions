import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch, { RequestInit } from "node-fetch";
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
      const agent = options.httpProxy ? new HttpsProxyAgent(options.httpProxy) : undefined;
      this.client = new OpenAI({
        baseURL: options.apiHost ? `${options.apiHost.replace(/\/$/, "")}/v1` : undefined,
        apiKey: options.apiKey,
        // The SDK uses the global fetch, which ignores Node agents, so send proxied requests through node-fetch.
        fetch: agent
          ? (url, init) =>
              nodeFetch(typeof url === "string" ? url : "url" in url ? url.url : url.href, {
                ...init,
                agent,
              } as RequestInit) as unknown as Promise<Response>
          : undefined,
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
