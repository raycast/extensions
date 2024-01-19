import { AI, environment } from "@raycast/api";
import { Provider, ProviderOptions } from "../types";
import { withTimeout } from "../utils/util";
// import { sendMessageToChatGPT } from "../utils/gpt";

class RaycastProvider extends Provider {
  constructor(options: ProviderOptions) {
    super(options);

    if (!environment.canAccess(AI)) {
      this.available = false;
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

    if (!environment.canAccess(AI)) {
      throw new Error("You do not have access to Raycast AI.");
    }

    const message = `${summarizePrompt}\n\nWhat needs to be summarized is as follows:\n\n${content}}`;

    try {
      const resp = await withTimeout(
        AI.ask(message, {
          model: apiModel as any,
          creativity: "low",
        }),
        200000,
      );

      console.log("raycast ai resp", resp);

      return resp;
    } catch (error) {
      console.error("Error summarizing content with Raycast AI:", error);
      throw error;
    }
  }
}

export { RaycastProvider };
