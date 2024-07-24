import Anthropic from "@anthropic-ai/sdk";
import { Message, MessageParam, RawMessageStreamEvent } from "@anthropic-ai/sdk/resources";
import { Stream } from "@anthropic-ai/sdk/streaming";
import { EMessage_role, ITalk, ITalkDataResult, ITalkHistory, ITalkQuestion, newTalkDataResult } from "../type";
import { ITrace } from "../trace/type";
import { ILlm } from "./type";

export const LLM_ANTHROPIC = "anthropic";

export class AnthropicLLM implements ILlm {
  protected key: string;
  protected llm: Anthropic | undefined;
  protected defaultModel: string = "claude-3-opus-20240229";

  constructor(key: string | undefined) {
    if (!key) {
      throw new Error("KEY is not defined");
    }

    this.key = key;
    this.#initialize();
  }

  #initialize() {
    if (this.llm === undefined) {
      this.llm = new Anthropic({ apiKey: this.key });
    }
  }

  async chat(chatData: ITalk): Promise<{ stream: boolean; data: Stream<RawMessageStreamEvent> | Message }> {
    if (!this.llm) throw new Error("LLM is not initialized");

    try {
      const answer = await this.llm.messages.create({
        stream: chatData.llm.stream,
        model: chatData.llm.model || this.defaultModel,
        messages: this.#prepareMessage("", chatData.conversation.history, chatData.conversation.question),
        system: chatData.conversation.system,
        max_tokens: 1024,
      });

      return {
        stream: chatData.llm.stream,
        data: answer,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepareResponse(chatData: ITalk, stream: boolean, trace: ITrace, answer: any): ITalkDataResult {
    let actualTrace = trace.changeHelper(undefined);
    const response: ITalkDataResult = newTalkDataResult();
    response.assistant = chatData.assistant.object;

    if (!stream) {
      response.content = answer.content[0].text;
      response.finish = true;

      trace.changeHelper({
        output: answer.content[0].text,
        token: {
          prompt: answer.usage.input_tokens || 0,
          completion: answer.usage.output_tokens || 0,
        },
      });
    } else {
      switch (answer.type) {
        case "message_start":
          trace.changeHelper({
            token: {
              prompt: answer.message.usage.input_tokens || 0,
              completion: answer.message.usage.output_tokens || 0,
            },
          });
          break;
        case "content_block_delta":
          response.content = answer.delta.text;
          actualTrace = trace.changeHelper(undefined);
          trace.changeHelper({
            output: actualTrace.output + answer.delta.text,
          });
          break;
        case "message_delta":
          actualTrace = trace.changeHelper(undefined);
          trace.changeHelper({
            token: {
              completion: actualTrace.token.completion + answer.usage.output_tokens,
            },
          });
          break;
        case "message_stop":
          response.finish = true;
          break;
        case "content_block_start" || "content_block_stop":
          break;
      }
    }

    return response;
  }

  #prepareMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    systemMessage: string | undefined,
    msgs: ITalkHistory[],
    lastMessage: ITalkQuestion | undefined
  ): MessageParam[] {
    const result: MessageParam[] = [];

    for (const msg of msgs) {
      switch (msg.role) {
        case EMessage_role.USER:
          result.push({
            role: "user",
            content: msg.content,
          });
          break;
        case EMessage_role.AI:
          result.push({
            role: "assistant",
            content: msg.content,
          });
          break;
        case EMessage_role.SYSTEM || EMessage_role.FUNCTION || EMessage_role.TOOL:
          continue;
          break;
      }
    }

    if (lastMessage) {
      result.push({
        role: "user",
        content: lastMessage.content,
      });
    }

    return result;
  }
}
