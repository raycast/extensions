import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Provider, ProviderOptions } from "../types";
// import { sendMessageToChatGPT } from "../utils/gpt";

class OpenaiProvider extends Provider {
  protected client: OpenAI | null;

  constructor(options: ProviderOptions) {
    super(options);

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
    const {
      // httpProxy,
      // apiHost,
      // apiKey,
      apiModel,
      summarizePrompt,
    } = this.options;

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
      const stream = await this.client!.beta.chat.completions.stream({
        model: apiModel ?? "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: summarizePrompt! },
          { role: "user", content: content },
        ],
        stream: true,
      });
      const chatCompletion = await stream.finalChatCompletion();
      // console.log('choooo', chatCompletion.choices)
      return chatCompletion.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      console.error("Error summarizing content:", error);
      throw error;
    }
  }
}

export { OpenaiProvider };
