import { Ollama, Message, ChatResponse } from "ollama";
import { EMessage_role, ITalk, ITalkDataResult, ITalkHistory, ITalkQuestion, newTalkDataResult } from "../type";
import { ITrace } from "../trace/type";
import { ILlm } from "./type";
import fetch from "node-fetch";
// @ts-expect-error ignore
globalThis.fetch = fetch;

export const LLM_OLLAMA = "ollama";

export class OllamaLLM implements ILlm {
  protected host: string;
  protected llm: Ollama | undefined;
  protected defaultModel: string = "llama3";

  constructor(host: string | undefined) {
    if (!host) {
      throw new Error("Ollama setting `API Url` is not defined");
    }

    this.host = host;
    this.#initialize();
  }

  #initialize() {
    if (this.llm === undefined) {
      this.llm = new Ollama({ host: this.host });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chat(chatData: ITalk): Promise<{ stream: boolean; data: any | ChatResponse }> {
    if (!this.llm) throw new Error("Ollama LLM is not initialized");

    try {
      const answer = await this.llm.chat({
        // @ts-expect-error ignore
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
      response.content = answer.message.content;
      response.finish = true;

      trace.changeHelper({
        output: answer.message.content,
        token: {
          prompt: answer.prompt_eval_count || 0,
          completion: answer.eval_count || 0,
        },
      });
    } else {
      response.content = answer.message.content;

      if (answer.done) {
        response.finish = true;
        trace.changeHelper({
          token: {
            prompt: answer.eval_count || 0,
            completion: answer.prompt_eval_count || 0,
          },
        });
      }
      actualTrace = trace.changeHelper(undefined);
      trace.changeHelper({
        output: actualTrace.output + (answer.message.content || ""),
      });
    }

    return response;
  }

  #prepareMessage(
    systemMessage: string | undefined,
    msgs: ITalkHistory[],
    lastMessage: ITalkQuestion | undefined
  ): Message[] {
    const result: Message[] = [];

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
