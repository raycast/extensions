import { Provider, Message } from "../base";
import { Prompt } from "../prompt";

import { TranslateQuery, ProviderProps } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_TIMEOUT } from "../utils";
import { useProxy } from "../../hooks/useProxy";

export default class extends Provider {
  protected props: ProviderProps;
  protected apikey: string;
  private anthropic: Anthropic;
  constructor(props: ProviderProps) {
    super(props);
    this.props = props;
    this.apikey = props.apikey!;
    const proxy = useProxy();

    this.anthropic = new Anthropic({
      apiKey: this.apikey,
      maxRetries: 3,
      timeout: DEFAULT_TIMEOUT,
      httpAgent: proxy,
    });
  }

  protected async *doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message> {
    const { quoteProcessor, meta } = prompt;
    const { isWordMode } = meta;
    const { system, messages } = this.messages(prompt);
    console.log(system);
    console.log(messages);
    const stream = await this.anthropic.messages.create({
      max_tokens: 1024,
      system,
      messages,
      model: this.props.apiModel!,
      stream: true,
    });
    const role = null;
    for await (const msg of stream) {
      if (msg.type == "message_start") {
        // role = msg.message.role
      } else if (msg.type == "content_block_delta") {
        const content = msg.delta.text;
        let targetTxt = content ? content : "";
        if (quoteProcessor) {
          targetTxt = quoteProcessor.processText(targetTxt);
        }
        yield { content: targetTxt, role, isWordMode };
      } else if (msg.type == "message_stop") {
        yield "stop";
      }
    }
  }

  messages(prompt: Prompt): { system: string; messages: Anthropic.MessageParam[] } {
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt } = prompt;
    return {
      system: rolePrompt + "\n" + assistantPrompts.join("\n") + commandPrompt,
      messages: [{ role: "user", content: contentPrompt }],
    };
  }
}
