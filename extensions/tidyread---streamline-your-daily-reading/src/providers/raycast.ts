import { AI, environment } from "@raycast/api";
import { Provider, ProviderOptions } from "../types";
// import { sendMessageToChatGPT } from "../utils/gpt";

function normalizeModel(name?: string) {
  if (!name) return "gpt-3.5-turbo-instruct";
  if (!name.includes("raycast-")) return "gpt-3.5-turbo-instruct";
  return name.replace("raycast-", "");
}

class RaycastProvider extends Provider {
  constructor(options: ProviderOptions) {
    super({
      ...options,
      apiModel: normalizeModel(options?.apiModel),
    });

    if (!environment.canAccess(AI)) {
      this.available = false;
    }
  }

  async summarize(content: string): Promise<string> {
    const { apiModel, summarizePrompt } = this.options;

    if (!this.available) {
      throw new Error("You do not have access to Raycast AI.");
    }

    const message = `${summarizePrompt}\n\nHere is the content:\n\n${content}`;

    console.log("raycast ai summarize prompt:", message);

    try {
      const resp = await AI.ask(message, {
        model: apiModel as any,
        creativity: "low",
      });
      console.log("raycast ai summarize resp", resp);

      return resp;
    } catch (error) {
      console.error("Error summarizing content with Raycast AI:", error);
      throw error;
    }
  }

  async translate(content: string, lang = "English"): Promise<string> {
    const { apiModel, translatePrompt } = this.options;

    if (!this.available) {
      throw new Error("You do not have access to Raycast AI.");
    }

    const prompt = typeof translatePrompt === "function" ? translatePrompt(lang) : translatePrompt || "";
    const message = `${prompt}\n\nHere is the content:\n\n${content}`;

    console.log("raycast ai translate prompt", message);

    try {
      const resp = await AI.ask(message, {
        model: apiModel as any,
        creativity: "low",
      });

      console.log("raycast ai translate resp", resp);

      return resp;
    } catch (error) {
      console.error("Error translate content with Raycast AI:", error);
      throw error;
    }
  }
}

export { RaycastProvider };
