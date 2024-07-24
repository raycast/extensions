import { OpenAI } from "openai";
import { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources";
import { Stream } from "openai/streaming";
import { EMessage_role, ITalk, ITalkDataResult, ITalkHistory, ITalkQuestion, newTalkDataResult } from "../type";
import { ITrace } from "../trace/type";
import { ILlm } from "./type";

export const LLM_OPENAI = "openai";

export class OpenaiLLM implements ILlm {
  protected key: string;
  protected llm: OpenAI | undefined;
  protected defaultModel: string = "gpt-4o";

  constructor(key: string | undefined) {
    if (!key) {
      throw new Error("KEY is not defined");
    }

    this.key = key;
    this.#initialize();
  }

  #initialize() {
    if (this.llm === undefined) {
      this.llm = new OpenAI({ apiKey: this.key });
    }
  }

  async chat(chatData: ITalk): Promise<{ stream: boolean; data: Stream<ChatCompletionChunk> | ChatCompletion }> {
    if (!this.llm) throw new Error("LLM is not initialized");

    try {
      const answer = await this.llm.chat.completions.create({
        stream: chatData.llm.stream,
        model: chatData.llm.model || this.defaultModel,
        messages: this.#prepareMessage(
          chatData.conversation.system,
          chatData.conversation.history,
          chatData.conversation.question
        ),
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
      response.content = answer.choices[0].message.content;
      response.finish = true;

      trace.changeHelper({
        output: answer.choices[0].message,
        token: {
          prompt: answer.usage.prompt_tokens || 0,
          completion: answer.usage.completion_tokens || 0,
        },
      });
    } else {
      response.content = answer.choices[0]?.delta?.content || "";

      if (answer.choices[0]?.finish_reason === "stop") {
        response.finish = true;
      }
      actualTrace = trace.changeHelper(undefined);
      trace.changeHelper({
        output: actualTrace.output + (answer.choices[0]?.delta?.content || ""),
      });
    }

    return response;
  }

  #prepareMessage(
    systemMessage: string | undefined,
    msgs: ITalkHistory[],
    lastMessage: ITalkQuestion | undefined
  ): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = [];

    if (systemMessage) {
      result.push({
        role: "system",
        content: systemMessage,
      });
    }

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
        case EMessage_role.SYSTEM:
          result.push({
            role: "system",
            content: msg.content,
          });
          break;
        case EMessage_role.FUNCTION || EMessage_role.TOOL:
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
